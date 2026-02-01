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

```yaml title="dockform.yaml"
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
    Volume names must match `^[a-z0-9_.-]+$`

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
- You can use environment expansion for dynamic names: `name: "${DOCKFORM_RUN_ID}_vol"`

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

The volume for the `config` fileset is created even if not explicitly declared. You can still list it under `contexts.default.volumes` for clarity.

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
| **destroy** | Removes all labeled volumes for the current identifier. |

### Snapshots and Restore

Dockform offers portable volume snapshots:

#### Snapshot

```bash
dockform volume snapshot <volume>
```

Creates `.tar.zst` plus a JSON sidecar under `.dockform/snapshots/<volume>/`.

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

=== "dockform.yaml"

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
