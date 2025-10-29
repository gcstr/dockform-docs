---
title: Filesets
---

# Filesets

Filesets keep a local directory in sync with a path inside a Docker volume.
They let you manage stack config, assets, or seeds declaratively, without baking files into images.

- **Declarative sync**: define the source, target volume, and target path; Dockform syncs diffs only.
- **Idempotent and incremental**: only changed, added, or removed files are applied.
- **Compose-friendly**: attach the target volume to services via Compose as an external volume.
- **Optional service restarts**: list services to restart after files are updated.

## Defining a fileset

A fileset has four required inputs: `source`, `target_volume`, `target_path`, and optional `exclude`/`restart_services`.

```yaml [dockform.yaml]
docker:
  context: default
  identifier: staging

filesets:
  traefik:
    source: traefik/config
    target_volume: traefik_config
    target_path: /etc/traefik
    restart_services:
      - traefik
    exclude:
      - ".git/"
      - "**/.DS_Store"
```

- **source**: local directory path, relative to the manifest file or absolute. Must exist.
- **target_volume**: Docker volume name. If missing, Dockform creates it during `apply`.
- **target_path**: absolute path inside the volume (must start with `/` and cannot be `/`).
- **exclude**: gitignore-like patterns. Directory patterns ending with `/` exclude everything under them.
- **restart_services**: Compose service names to restart when this fileset changes.
- **apply_mode**: how to apply file changes. See [Apply Modes](#apply-modes) below.
- **ownership**: optional permissions block. See [Ownership & Permissions](#ownership--permissions).

## Using with Compose

Attach the fileset’s `target_volume` to services as an external volume.

::: code-group

```yaml [dockform.yaml]
networks:
  traefik: {}
filesets:
  traefik:
    source: traefik/config
    target_volume: traefik_config
    target_path: /etc/traefik
    restart_services:
      - traefik
```

```yaml [app/docker-compose.yaml]
services:
  traefik:
    image: traefik:v3
    networks:
      - traefik
    volumes:
      - traefik_config:/etc/traefik

volumes:
  traefik_config:
    external: true
```

:::

## How sync works

Dockform builds a content index from the local source and compares it with a remote index inside the volume at the `target_path`.

- The index is stored at `.dockform-index.json` inside the target path.
- On differences, Dockform:
  - packs created/updated files in a tar and extracts them into the volume, creating parent directories as needed;
  - deletes files that are present remotely but absent locally;
  - writes the new index file.
- If nothing changed (same tree hash), the fileset is skipped.

## Lifecycle and operations

- **plan**: shows file operations per fileset when the Docker client is available; otherwise, shows a generic "planned" note.
- **apply**:
  - Ensures the target volume exists (created via Volumes logic if missing).
  - Computes diffs and syncs changes into the volume.
  - Writes/updates `.dockform-index.json`.
  - Queues `restart_services` for restart after compose changes are applied.
- **destroy**: removes fileset-associated volumes first, then standalone volumes and networks.

Notes:
- Filesets operate on volumes, not bind mounts.
- Multiple filesets can target different volumes and paths.
- Large trees are processed deterministically; paths are sorted for stable archives and hashes.

## Apply Modes

Filesets support two apply modes that control how files are synchronized with running containers:

### Hot Mode (Default)

With `apply_mode: hot` (or when `apply_mode` is not specified), Dockform syncs files while containers are running, then restarts the services listed in `restart_services`.

```yaml [dockform.yaml]
filesets:
  nginx_config:
    source: nginx/conf
    target_volume: nginx_config
    target_path: /etc/nginx
    apply_mode: hot  # Default behavior
    restart_services:
      - nginx
```

**Hot mode workflow:**
1. Sync files to volume (containers keep running)
2. Apply stack changes via `docker compose up`
3. Restart services listed in `restart_services`

This is the fastest mode and works well for most stacks that can reload configuration without stopping.

### Cold Mode

With `apply_mode: cold`, Dockform stops the services selected as targets, syncs files, then starts those services again.

```yaml [dockform.yaml]
filesets:
  database_config:
    source: postgres/conf
    target_volume: postgres_config
    target_path: /etc/postgresql
    apply_mode: cold
    restart_services:
      - postgres
      - pgbouncer
```

**Cold mode workflow:**
1. Stop target services
2. Sync files to volume
3. Start the previously stopped services

Use cold mode when:
- The stack requires files to be updated only when stopped
- File changes could corrupt running processes
- You need atomic file updates across multiple files
- Database configurations or other critical system files need updating

::: tip
Cold mode does nothing if no targets are set (allowed). It only changes the sync contract (no in-place updates while services are running).
:::

### Choosing the Right Mode

| Scenario | Recommended Mode | Reason |
|----------|------------------|---------|
| Web server configs | `hot` | Can reload config via restart |
| Static assets | `hot` | No restart needed, just file sync |
| Database configs | `cold` | Requires clean shutdown/startup |
| SSL certificates | `hot` | Most apps can reload certs |
| Stack binaries | `cold` | Files must not change while running |

## Restart targets

The `restart_services` field controls which services Dockform acts on after a fileset sync (for hot) or before/after sync (for cold).

Accepted values:
- A list of service names: `[serviceA, serviceB]`
- The sentinel string: `attached`
- Omitted: no restarts (targets = ∅)

Resolution rules:
- If omitted → targets = ∅ (no-op)
- If list → targets = that list (deduped, order preserved)
- If `attached` → Dockform discovers all services that mount `target_volume` (any path, ro/rw) and uses that set (deduped). If none found, continue without restarts.

Apply flow:
- Hot (default): sync files while services are running; if targets ≠ ∅ then restart targets.
- Cold: if targets = ∅, do not stop/start anything (still valid); else, stop all targets → sync files → start all targets.

## Ownership & Permissions

Filesets can enforce ownership and permission bits on the files they sync. Add an `ownership` block to opt in:

```yaml [dockform.yaml]
filesets:
  config:
    source: ./config
    target_volume: app_config
    target_path: /etc/app
    ownership:
      user: "1000"
      group: "1000"
      file_mode: "0644"
      dir_mode: "0755"
      preserve_existing: false
```

Supported fields:

- `user`: numeric UID (recommended) or POSIX username to apply via `chown`.
- `group`: numeric GID or POSIX group name to apply via `chgrp`.
- `file_mode`: octal string (e.g. `"0644"` or `"600"`) applied to regular files.
- `dir_mode`: octal string for directories (e.g. `"0755"`); skipped when unset.
- `preserve_existing`: when `true`, only newly created or updated paths (and their parent directories) get modified; when omitted or `false`, Dockform walks the entire target subtree.

Ownership runs after files finish syncing, using Dockform’s helper container (`alpine:3.22`) that mounts the target volume at `target_path`. If you supply names instead of numeric IDs, they must resolve inside that container via `getent`; otherwise Dockform logs a warning and skips the `chown` step. Numeric IDs avoid that portability issue.

When `preserve_existing` is enabled, existing files keep their prior owner and mode unless they change contents. New content still receives the configured settings, so you can stage migrations incrementally. With it disabled (default) Dockform reapplies ownership and modes across the full tree on each apply to ensure drift is corrected.

## Example: static site assets

::: code-group

```yaml [dockform.yaml]
stacks:
  web:
    root: ./web
    project:
      name: web-staging

filesets:
  site:
    source: ./assets
    target_volume: web-assets
    target_path: /usr/share/nginx/html
    restart_services:
      - web
    exclude:
      - ".git/"
      - "**/*.map"

volumes:
  web-assets: {}
```

```yaml [web/docker-compose.yaml]
services:
  web:
    image: nginx:alpine
    volumes:
      - web-assets:/usr/share/nginx/html

volumes:
  web-assets:
    external: true
```

:::

- Run `dockform plan` to preview volume creation and fileset changes.
- Run `dockform apply` to sync files, start/update services, and restart any listed services.

## Example: stack requiring cold updates

Some stacks require that configuration files are only updated when the container is stopped. For example, certain media management tools or databases that lock configuration files:

::: code-group

```yaml [dockform.yaml]
stacks:
  media:
    root: ./media

filesets:
  jackett:
    source: jackett/config
    target_volume: jackett_data
    target_path: /config
    apply_mode: cold
    restart_services:
      - jackett
```

```yaml [media/docker-compose.yaml]
services:
  jackett:
    image: linuxserver/jackett
    volumes:
      - jackett_data:/config

volumes:
  jackett_data:
    external: true
```

:::

When you run `dockform apply`:
1. Dockform stops the `jackett` service (target)
2. Syncs configuration files from `jackett/config/` to the volume
3. Starts the `jackett` service
