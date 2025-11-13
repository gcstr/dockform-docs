---
title: The Manifest File
icon: lucide/scan-eye
---

# The Manifest File

A Dockform manifest is a single YAML file that defines all resources needed for a Compose project. With it, you can declare stacks, environment variables, secrets, volumes, networks, and filesets in one place, making your stack fully reproducible and declarative.

## Overview

``` yaml { .yaml .annotate }
docker:
  context: default
  identifier: my-project

environment:
  files:
    - global.env
  inline:
    - GLOBAL_VAR=value

sops:
  age:
    key_file: ${AGE_KEY_FILE}
    recipients:
      - age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
  pgp:
    keyring_dir: ~/.gnupg
    recipients:
      - 0xDEADBEEFCAFEBABE

secrets:
  sops:
    - secrets.env

stacks:
  web:
    root: ./web # (1)!
    files:
      - docker-compose.yml
      - docker-compose.override.yml
    profiles:
      - production
    environment:
      files:
        - variables.env
      inline:
        - APP_NAME=web
        - DEBUG=false
    secrets:
      sops:
        - secrets.env
  api:
    root: ./api
    environment:
      inline:
        - SERVICE_NAME=api

networks: # (3)!
  app-network:
    driver: bridge
    options:
      com.docker.network.bridge.enable_icc: "false"

filesets: # (2)!
  static-assets:
    source: ./assets
    target_volume: app-data
    target_path: /var/www/html/assets
    apply_mode: hot
    restart_services:
      - nginx
    exclude:
      - "**/.DS_Store"
      - "*.tmp"
      - "node_modules/**"
      - ".git/**"
```

1.  Here's where you tell **Dockform** where to find your Docker Compose files.
    The `files:` key below is optional, but it's useful for when you have multiple compose files.
2.  **Filesets** provide an easy way to push any kind of file to a Docker volume. 
    Just map it to a local folder then **Dockform** will do the sync.
3.  Define Docker networks declaratively. Let **Dockform** manage it for you.

## `docker:`

The `docker` block defines which daemon to use (via [Docker Context](https://docs.docker.com/engine/manage-resources/contexts/)) and an `identifier` that groups the resources managed by Dockform.

### `context:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| String | `"default"` | :lucide-check: |

The [Docker Context :lucide-external-link:](https://docs.docker.com/engine/manage-resources/contexts/) that this configuration applies to. It must exist locally even if it points to a remote daemon.

??? tip
    To create a context for a remote daemon run the following command:

    ```bash
    docker context create \
    --docker host=ssh://user@server \
    --description="My remote server" \
    remote
    ```

### `identifier:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| String | `null`      | :lucide-check: |

Dockform uses this string to label and group all managed resources.

!!! danger "Important"
    Changing the `identifier` of an existing deployment will **not** update already deployed resources.

## `environment:`

You can define global or stack-specific environment variables. Variables declared at the root level apply to all stacks. Variables under `stcks.<app>.environment` are scoped to that stack only.

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Map    | `null`      | :lucide-x:     |

!!! quote ""
    In case of conflict, stack-specific variables override global variables.

=== "Global"

    ```yaml
    environment:
      files:
        - global.env
      inline:
        - GLOBAL_VAR=value
        - ENVIRONMENT=production
    ```

=== "Scoped"

    ```yaml
    stacks:
      web:
        environment:
          files:
            - app.env
          inline:
            - APP_NAME=web
            - DEBUG=false
    ```

### `files:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Array  | `[]`        | :lucide-x:     |

Array of dotenv file paths relative to the manifest file location.  
Each line must follow the `KEY=VALUE` format.

### `inline:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Array  | `[]`        | :lucide-x:     |

Array of `KEY=VALUE` entries declared directly in the manifest.


## `secrets:`

Secrets can also be global or app-specific. Root-level secrets are exposed to all stacks, while `stacks.<app>.secrets` only apply to that app.

!!! quote ""
    In case of conflict, stack-specific secrets override global ones.

Secrets are managed with [SOPS](https://github.com/getsops/sops). Dockform supports both **Age** and **PGP (GnuPG)** backends. See [Secrets Workflow](secrets/) for details.

=== "Global"

    ```yaml
    sops:
      age:
        key_file: ${AGE_KEY_FILE}
      pgp:
        keyring_dir: ~/.gnupg

    secrets:
      sops:
        - secrets.env
    ```

=== "Scoped"

    ```yaml
    sops:
      age:
        key_file: ${AGE_KEY_FILE}
      pgp:
        keyring_dir: ~/.gnupg

    stacks:
      web:
        secrets:
          sops:
            - secrets.env
    ```

### `key_file:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| String | `null`      | :lucide-x:     |

Path to an **age** key file.

### `sops:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Array  | `[]`        | :lucide-x:     |


Array of encrypted dotenv file paths.

## `volumes:`

### `<volume_name>:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Map    | `null`      | :lucide-x:     |

Name of a Docker [named volume](https://docs.docker.com/engine/storage/volumes/).

## `networks:`

### `<network_name>:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Map    | `null`      | :lucide-x:     |

Name of a Docker [network](https://docs.docker.com/reference/cli/docker/network/create/).

## `stacks:`

The `stacks` block is where all Docker Compose configurations converge.

### `<stack_name>:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Map    | `null`      | :lucide-check: |

Name of the stack.

### `root:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| String | `null`      | :lucide-check: |

Path relative to the manifest file. Must contain at least one Docker Compose file.

!!! Note
    All file paths under an stack (Compose, dotenv, secrets) are resolved relative to this folder.

### `files:`

| Type  | Default                                           |  Required  |
| ----- | ------------------------------------------------- |:----------:|
| Array | `[docker-compose.yml]` or `[docker-compose.yaml]` | :lucide-x: |

List of Docker Compose files. If omitted, Dockform will look for `docker-compose.yml` or `docker-compose.yaml` in the stack root.

### `profiles:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Array  | `[]`        | :lucide-x:     |

Array of Docker Compose [service profiles](https://docs.docker.com/compose/how-tos/profiles/) to enable.

### `environment:`
See [environment](#environment).

### `secrets:`
See [secrets](#secrets).

## `filesets:`

Filesets pre-populate volumes with files such as configs or static assets.

### `<fileset_name>:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Map    | `null`      | :lucide-check: |

Name of the fileset.

### `source:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| String | `null`      | :lucide-check: |

Path (relative to the manifest) containing the files to copy into the volume.

### `target_volume:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| String | `null`      | :lucide-check: |

The name of the volume to contain the files. A new volume will be created unless a volume with the same name is declared under [volumes](#volumes).

### `target_path:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| String | `null`      | :lucide-check: |

Absolute path inside the container where the files will be available. Root (`/`) is not allowed.

### `restart_services:`

| Type            | Default              |  Required  |
| --------------- | -------------------- |:----------:|
| Array or String | `null` (no restarts) | :lucide-x: |

Controls which services are acted on after a fileset changes:
- List: `[serviceA, serviceB]` → explicitly target these services
- String: `"attached"` → auto-discover services that mount `target_volume`

In hot mode, targets are restarted after sync. In cold mode, targets are stopped before sync and started after.

!!! Tip
    If no targets are resolved (omitted or none attached), Dockform proceeds without restarts.

### `apply_mode:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| String | `hot`       | :lucide-x:     |

Controls how file changes are applied. Can be `"hot"` (sync files while containers run, then restart targets if any) or `"cold"` (stop targets, sync files, then start targets). See [Filesets](/manifest/filesets#apply-modes) for details.

### `exclude:`

| Type   | Default     |    Required    |
| ------ | ----------- |:--------------:|
| Array  | `null`      | :lucide-x:     |

List of files or folders to ignore. Paths matching any entry will not be copied to the volume.