---
title: Volumes
---

# Volumes

Dockform manages Docker volumes declaratively through the root `volumes` map and implicitly via `filesets`.
This replaces imperative `docker volume create` commands with a single source of truth in your manifest.

- **Declarative management**: define desired volumes once; Dockform creates any that are missing.
- **Compose-friendly**: use Dockform-managed volumes as `external` volumes in `docker compose` files.
- **Idempotent**: safe to run repeatedly; only missing volumes are created.

## Defining volumes in the manifest

Declare top-level volumes under `volumes:`. Keys are the volume names that will be created on the Docker host. For networks (with driver/options and drift handling), see [Networks](/manifest/networks.md).

```yaml [dockform.yaml]
docker:
  context: default
  identifier: staging

volumes:
  db-data: {}
  traefik_config: {}
```

- **Name rules**: keys must match `^[a-z0-9_.-]+$`.
- The value is an empty object today (reserved for future options).

## Using volumes from compose

Dockform does not inject volumes into compose files. Instead, you reference volumes that Dockform manages as `external` in your compose files and bind them to services.

```yaml [docker-compose.yaml]
services:
  db:
    image: postgres:16
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
    external: true
    # optional: override the actual volume name if you template it
    # name: "staging-db-data"
```

- If you set `volumes.db-data.external: true`, Docker Compose will expect a pre-existing Docker volume named `db-data` (or the provided `name:`), which Dockform ensures exists during `apply`.
- You may use environment expansion in compose for the `name:` field if needed (e.g., `name: "df_${DOCKFORM_RUN_ID}_vol"`).

## Volumes created implicitly by filesets

A `fileset` keeps a local folder in sync with a path inside a Docker volume. When a fileset targets a volume that does not yet exist, Dockform creates that volume automatically.

```yaml [dockform.yaml]
filesets:
  traefik:
    source: traefik/config
    target_volume: traefik_config
    target_path: /etc/traefik
    restart_services:
      - traefik
```

In this example, the `traefik_config` volume will be created if missing, even if it is not listed under the root `volumes:` map. You can still list it explicitly for clarity if you prefer.

## Lifecycle and operations

- **plan**: shows which volumes will be created or removed relative to your manifest and labeled resources in the Docker context.
- **apply**:
  - Lists existing labeled volumes and creates any missing ones from `volumes:` and `filesets.target_volume`.
  - Labels volumes with `io.dockform.identifier=<docker.identifier>`.
  - Proceeds to sync filesets and run `docker compose up` for stacks.
- **destroy**: discovers all labeled resources for the current identifier and removes them, including volumes (fileset volumes first, then standalone).

### Snapshots and restore

Dockform offers portable volume snapshots stored next to your manifest by default:

#### Snapshot

```sh
$ dockform volume snapshot <volume>
```

creates `.tar.zst` plus a JSON sidecar under `.dockform/snapshots/<volume>/...`.

#### Restore

```sh
dockform volume restore <volume> <snapshot>`
```

restores into an existing, empty volume (use `--force` to clear, `--stop-containers` to stop users).

Snapshots are created with `tar | zstd` in a helper container, streaming data back to your machine—works for local and remote Docker contexts. Metadata includes a short spec hash (driver/options/labels), checksum and quick stats to validate and pick the right snapshot.

Notes:
- Dockform checks for existing volumes by name; it will not duplicate or rename volumes.
- Dockform only removes volumes that carry the Dockform label for the active identifier.

## End-to-end example

::: code-group

```yaml [dockform.yaml]
docker:
  context: default
  identifier: staging

stacks:
  app:
    root: ./app
    project:
      name: app-staging

volumes:
  app-data: {}

filesets:
  config:
    source: ./config
    target_volume: app-config
    target_path: /etc/app
```

```yaml [app/docker-compose.yaml]
services:
  web:
    image: nginx:alpine
    volumes:
      - app-data:/var/lib/app
      - app-config:/etc/app

volumes:
  app-data:
    external: true
  app-config:
    external: true
```

:::

- Run `dockform plan` to see the pending volume creations.
- Run `dockform apply` to create volumes, sync files, and start services.
