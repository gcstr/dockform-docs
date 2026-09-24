---
title: Volumes
icon: lucide/box
---

# Volumes

Dockform manages Docker volumes declaratively through context-scoped `volumes` maps and implicitly via filesets.
This replaces imperative `docker volume create` commands with a single source of truth in your manifest.

- **Declarative management**: Define desired volumes once; Dockform creates any that are missing.
- **Context-scoped**: Volumes are defined per Docker context for multi-host deployments.
- **Compose-friendly**: Use Dockform-managed volumes as `external` volumes in your compose files.
- **Idempotent**: Safe to run repeatedly; only missing volumes are created.

## Defining Volumes

Declare volumes under each context in your manifest:

```yaml title="dockform.yml"
identifier: staging

contexts:
  default:
    volumes:
      db-data: {}
      app-config: {}
  
  production:
    volumes:
      prod-db-data: {}
      prod-app-config: {}
```

!!! info "Naming rules"
    Volume names follow Docker's native naming rules.

## Using Volumes from Compose

Reference Dockform-managed volumes as `external` in your compose files:

```yaml title="default/db/compose.yaml"
services:
  postgres:
    image: postgres:16
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
    external: true
```

- With `external: true`, Docker Compose expects a pre-existing volume
- Dockform ensures the volume exists during `apply`

## Volumes from Filesets

When a fileset targets a volume that doesn't exist, Dockform creates it automatically.

With the directory structure:

```
default/web/
├── compose.yaml
└── volumes/
    └── config/        # Fileset discovered here
        └── nginx.conf
```

The `config` fileset's volume, `web_config` (`<stack>_<fileset>`), is created even if not explicitly declared. You can still list it under `contexts.default.volumes` for clarity, or to mark it [`destroy: false`](#keeping-a-volume-on-destroy).

## Multi-Context Volumes

Different contexts can have different volumes:

```yaml
identifier: myapp

contexts:
  default:
    volumes:
      dev-data: {}      # Local development
  
  staging:
    volumes:
      staging-data: {}  # Staging server
  
  production:
    volumes:
      prod-data: {}     # Production server
      backup-data: {}
```

## Lifecycle and Operations

| Step | Operation |
| -- | -- |
| **plan** | Shows which volumes will be created or removed relative to your manifest and labeled resources. |
| **apply** | Creates missing volumes, labels them with `io.dockform.identifier=<identifier>`, then syncs filesets and runs compose. |
| **destroy** | Removes all labeled volumes for the current identifier, except the ones marked `destroy: false`. |

### Keeping a volume on destroy

Mark a volume `destroy: false` to have `dockform destroy` leave it in place. This is useful for data volumes you want to keep and remove by hand:

```yaml title="dockform.yml"
contexts:
  default:
    volumes:
      db-data:
        destroy: false
      scratch: {}
```

`dockform destroy` then lists `db-data` as `kept (destroy: false)` and removes everything else. If a fileset writes into a kept volume, the volume is still kept. When everything left in scope is kept, destroy prints "Nothing to destroy" and skips the confirmation prompt.

!!! warning "The protection lives in the manifest"
    `destroy: false` only protects a volume while its entry is in the manifest, and it only applies to `dockform destroy`. If you delete the entry, the next `plan` shows the volume as `will be deleted`, and `apply` removes it once you confirm. This works like Terraform's `prevent_destroy`.

### Volumes that already exist

Docker sets a volume's labels only when it creates the volume, so Dockform can't take over one that already exists without its `io.dockform.identifier` label. `plan` reports such a volume as `exists (unlabeled, not managed by dockform)` and leaves it alone:

- `apply` doesn't recreate it, relabel it, or touch its data
- filesets that target it still sync into it
- `destroy` never removes it, because Dockform only removes volumes carrying its label

To bring an existing volume under Dockform, recreate it through Dockform and move the data across with a snapshot:

```bash
dockform volume snapshot db-data     # 1. save the data
docker volume rm db-data             # 2. remove the unlabeled volume (stop its containers first)
dockform apply                       # 3. Dockform recreates it with its label
dockform volume restore db-data <snapshot-path> --stop-containers --force   # 4. put the data back
```

`apply` starts the stack again in step 3, so the containers may already have written into the new volume. `--stop-containers` stops them during the restore, and `--force` lets the restore overwrite whatever they wrote. The volume has to be declared under `contexts.<context>.volumes` (or be a fileset target) for step 3 to recreate it.

### Snapshots and Restore

Dockform offers portable volume snapshots:

#### Snapshot

```bash
dockform volume snapshot <volume>
```

Creates `.tar.zst` plus a JSON sidecar under `.dockform/snapshots/<context>/<volume>/`.

#### Restore

```bash
dockform volume restore <volume> <snapshot>
```

Restores into an existing, empty volume (use `--force` to clear, `--stop-containers` to stop users).

Snapshots work for both local and remote Docker contexts.

!!! Note
    - Dockform only manages volumes that carry its label for the active identifier
    - Volumes are checked by name; Dockform won't duplicate or rename volumes

## Example

=== "dockform.yml"

    ```yaml
    identifier: staging

    contexts:
      default:
        volumes:
          app-data: {}
          app-config: {}
    ```

=== "default/app/compose.yaml"

    ```yaml
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

Run `dockform plan` to preview volume creation, then `dockform apply` to create volumes and start services.
