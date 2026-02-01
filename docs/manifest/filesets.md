---
title: Filesets
icon: lucide/folder-sync
---

# Filesets

Filesets keep a local directory in sync with a path inside a Docker volume.
They let you manage configuration files, static assets, or seed data declaratively, without baking files into images.

In v0.8, filesets are **discovered automatically** from `volumes/` directories inside each stack.

<div class="grid cards" markdown>

- :lucide-refresh-ccw-dot: **Declarative sync**  
  Define the source and target; Dockform syncs diffs only.

- :lucide-arrow-up-wide-narrow: **Idempotent and incremental**  
  Only changed, added, or removed files are applied.

- :lucide-puzzle: **Auto-discovery**  
  Filesets are found in `<context>/<stack>/volumes/` directories.

- :lucide-power: **Optional service restarts**  
  Configure services to restart after files are updated.

</div>

## Automatic Discovery

Dockform discovers filesets from `volumes/` directories inside each stack:

```
my-project/
├── dockform.yml
├── default/
│   └── web/
│       ├── compose.yaml
│       └── volumes/           # ← Filesets directory
│           ├── config/        # ← Fileset "config"
│           │   └── nginx.conf
│           └── static/        # ← Fileset "static"
│               ├── index.html
│               └── styles.css
```

Each subdirectory of `volumes/` becomes a fileset. The directory name is used as:

- The **fileset name**
- The **target volume name** (created if it doesn't exist)

### Discovery Defaults

For each discovered fileset:

| Property | Default Value |
|----------|---------------|
| `source` | `<stack>/volumes/<fileset>/` |
| `target_volume` | `<fileset>` (same as directory name) |
| `target_path` | `/<fileset>` (root path with fileset name) |
| `apply_mode` | `hot` |

### Customizing Discovery

Change the volumes directory name:

```yaml
identifier: myapp

discovery:
  volumes_dir: data  # Look for <stack>/data/ instead of <stack>/volumes/

contexts:
  default: {}
```

## Using Filesets with Compose

Reference fileset volumes as `external` in your compose files:

=== "Directory Structure"

    ```
    default/traefik/
    ├── compose.yaml
    └── volumes/
        └── config/
            ├── traefik.yaml
            └── dynamic/
                └── routers.yaml
    ```

=== "compose.yaml"

    ```yaml
    services:
      traefik:
        image: traefik:v3
        volumes:
          - config:/etc/traefik

    volumes:
      config:
        external: true
    ```

The `config` volume is automatically created and synced with the contents of `volumes/config/`.

## How Sync Works

Dockform builds a content index from the local source and compares it with a remote index inside the volume:

1. **Index storage**: `.dockform-index.json` inside the target path
2. **On differences**:
   - Packs created/updated files in a tar archive
   - Extracts them into the volume
   - Deletes files present remotely but absent locally
   - Writes the new index file
3. **No changes**: If tree hashes match, the fileset is skipped

## Apply Modes

Filesets support two apply modes that control how files are synchronized with running containers:

### Hot Mode (Default)

With `apply_mode: hot`, Dockform syncs files while containers are running, then restarts configured services.

```
volumes/
└── nginx-config/
    └── nginx.conf
```

**Hot mode workflow:**

1. Sync files to volume (containers keep running)
2. Apply stack changes via `docker compose up`
3. Restart services if configured

### Cold Mode

With `apply_mode: cold`, Dockform stops services first, syncs files, then starts them again.

Use cold mode when:

- Files must not change while services are running
- Atomic updates across multiple files are required
- Database or critical system configurations are being updated

!!! note
    Apply mode is configured via metadata files or future manifest extensions. Default is always `hot`.

## Ownership & Permissions

Filesets can enforce ownership and permission bits on synced files. Create a `.dockform-ownership.yaml` file in your fileset directory:

```yaml title="volumes/config/.dockform-ownership.yaml"
user: "1000"
group: "1000"
file_mode: "0644"
dir_mode: "0755"
preserve_existing: false
```

| Field | Description |
|-------|-------------|
| `user` | Numeric UID or POSIX username |
| `group` | Numeric GID or POSIX group name |
| `file_mode` | Octal permission for files (e.g., `"0644"`) |
| `dir_mode` | Octal permission for directories (e.g., `"0755"`) |
| `preserve_existing` | When `true`, only new/updated files get modified |

!!! tip
    Use numeric IDs for portability. Named users/groups must exist inside the helper container (`alpine:3.22`).

## Excluding Files

Create a `.dockform-exclude` file with gitignore-style patterns:

```title="volumes/static/.dockform-exclude"
.git/
**/.DS_Store
*.tmp
node_modules/
```

## Lifecycle and Operations

| Step | Operation |
| -- | -- |
| **plan** | Shows file operations per fileset when Docker is available |
| **apply** | Ensures volume exists, computes diffs, syncs changes, writes index, queues restarts |
| **destroy** | Removes fileset-associated volumes along with other labeled resources |

## Multi-Context Filesets

Filesets are discovered per context, allowing different configurations for different environments:

```
my-project/
├── dockform.yml
├── default/
│   └── nginx/
│       └── volumes/
│           └── config/
│               └── nginx.dev.conf
└── production/
    └── nginx/
        └── volumes/
            └── config/
                └── nginx.prod.conf
```

## Examples

### Basic: Static Site Assets

```
default/web/
├── compose.yaml
└── volumes/
    └── html/
        ├── index.html
        ├── styles.css
        └── app.js
```

```yaml title="default/web/compose.yaml"
services:
  nginx:
    image: nginx:alpine
    volumes:
      - html:/usr/share/nginx/html

volumes:
  html:
    external: true
```

### Traefik Configuration

```
default/traefik/
├── compose.yaml
└── volumes/
    └── config/
        ├── traefik.yaml
        └── dynamic/
            ├── routers.yaml
            └── middlewares.yaml
```

```yaml title="default/traefik/compose.yaml"
services:
  traefik:
    image: traefik:v3
    command:
      - --configFile=/etc/traefik/traefik.yaml
    volumes:
      - config:/etc/traefik

volumes:
  config:
    external: true
```

### Database Seeds

```
default/db/
├── compose.yaml
└── volumes/
    └── init/
        ├── 01-schema.sql
        └── 02-seed.sql
```

```yaml title="default/db/compose.yaml"
services:
  postgres:
    image: postgres:16
    volumes:
      - init:/docker-entrypoint-initdb.d

volumes:
  init:
    external: true
```

Run `dockform plan` to preview fileset changes, then `dockform apply` to sync files and start services.
