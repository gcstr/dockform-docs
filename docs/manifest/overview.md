---
title: The Manifest File
outline: deep
---

# The Manifest File

A Dockform manifest is a single YAML file that defines all resources needed for a Compose project. With it, you can declare stacks, environment variables, secrets, volumes, networks, and filesets in one place, making your stack fully reproducible and declarative.

## Overview

```yaml
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
    root: ./web
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

networks:
  app-network:
    driver: bridge
    options:
      com.docker.network.bridge.enable_icc: "false"

filesets:
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

## Docker

The `docker` block defines which daemon to use (via [Docker Context](https://docs.docker.com/engine/manage-resources/contexts/)) and an `identifier` that groups the resources managed by Dockform.

### `context` <Badge type="warning" text="required" />
* Type: `String`  
* Default: `"default"`

The [Docker Context](https://docs.docker.com/engine/manage-resources/contexts/) that this configuration applies to. It must exist locally even if it points to a remote daemon.

To create a context for a remote daemon:

```bash
docker context create \
  --docker host=ssh://user@server \
  --description="My remote server" \
  remote
```

### `identifier` <Badge type="warning" text="required" />
* Type: `String`  
* Default: `null`

Dockform uses this string to label and group all managed resources.

> [!IMPORTANT]  
> Changing the `identifier` will **not** update already deployed resources.

## Environment Variables

You can define global or stack-specific environment variables. Variables declared at the root level apply to all stacks. Variables under `stcks.<app>.environment` are scoped to that stack only.

> In case of conflict, stack-specific variables override global variables.

::: code-group

```yaml [Global]
environment:
  files:
    - global.env
  inline:
    - GLOBAL_VAR=value
    - ENVIRONMENT=production
```

```yaml [Scoped]
stacks:
  web:
    environment:
      files:
        - app.env
      inline:
        - APP_NAME=web
        - DEBUG=false
```
:::

### `files` <Badge type="tip" text="optional" />
* Type: `Array`  
* Default: `[]`

Array of dotenv file paths (each line must follow the `KEY=VALUE` format).

### `inline` <Badge type="tip" text="optional" />
* Type: `Array`  
* Default: `[]`

Array of `KEY=VALUE` entries declared directly in the manifest.


## Secrets

Secrets can also be global or app-specific. Root-level secrets are exposed to all stacks, while `stacks.<app>.secrets` only apply to that app.

> In case of conflict, stack-specific secrets override global ones.

Secrets are managed with [SOPS](https://github.com/getsops/sops). Dockform supports both **Age** and **PGP (GnuPG)** backends. See [Secrets Workflow](secrets/secrets) for details.

::: code-group

```yaml [Config]
sops:
  age:
    key_file: ${AGE_KEY_FILE}
  pgp:
    keyring_dir: ~/.gnupg
```

```yaml [Global]
secrets:
  sops:
    - secrets.env
```

```yaml [Scoped]
stacks:
  web:
    secrets:
      sops:
        - secrets.env
```
:::

### `key_file` <Badge type="tip" text="optional" />
* Type: `String`  
* Default: `null`

Path to an **Age** key file.

### `sops` <Badge type="tip" text="optional" />
* Type: `Array`  
* Default: `[]`

Array of encrypted dotenv file paths.

## Volumes

### `<volume_name>` <Badge type="tip" text="optional" />
* Type: `Map`  
* Default: `null`

Name of a Docker [named volume](https://docs.docker.com/engine/storage/volumes/).

## Networks

### `<network_name>` <Badge type="tip" text="optional" />
* Type: `Map`  
* Default: `null`

Name of a Docker [network](https://docs.docker.com/reference/cli/docker/network/create/).

## Stacks

The `stacks` block is where all Docker Compose configurations converge.

### `<stack_name>` <Badge type="warning" text="required" />
* Type: `Map`  
* Default: `null`

Name of the stack.

### `root` <Badge type="warning" text="required" />
* Type: `String`  
* Default: `null`

Path relative to the manifest file. Must contain at least one Docker Compose file.

::: tip
All file paths under an stack (Compose, dotenv, secrets) are resolved relative to this folder.
:::

### `files` <Badge type="tip" text="optional" />
* Type: `Array`  
* Default: `[docker-compose.yml]` or `[docker-compose.yaml]`

List of Docker Compose files. If omitted, Dockform will look for `docker-compose.yml` or `docker-compose.yaml` in the stack root.

### `profiles` <Badge type="tip" text="optional" />
* Type: `Array`  
* Default: `[]`

Array of Docker Compose [service profiles](https://docs.docker.com/compose/how-tos/profiles/) to enable.

### `environment` <Badge type="tip" text="optional" />
See [Environment Variables](#environment-variables).

### `secrets` <Badge type="tip" text="optional" />
See [Secrets](#secrets).

## Filesets

Filesets pre-populate volumes with files such as configs or static assets.

### `<fileset_name>` <Badge type="warning" text="required" />
* Type: `Map`  
* Default: `null`

Name of the fileset.

### `source` <Badge type="warning" text="required" />
* Type: `String`  
* Default: `null`

Path (relative to the manifest) containing the files to copy into the volume.

### `target_volume` <Badge type="warning" text="required" />
* Type: `String`  
* Default: `null`

The name of the volume to contain the files. A new volume will be created unless a volume with the same name is declared under [volumes](#volumes).

### `target_path` <Badge type="warning" text="required" />
* Type: `String`  
* Default: `null`

Absolute path inside the container where the files will be available. Root (`/`) is not allowed.

### `restart_services` <Badge type="tip" text="optional" />
* Type: `Array | String`  
* Default: `null` (no restarts)

Controls which services are acted on after a fileset changes:
- List: `[serviceA, serviceB]` → explicitly target these services
- String: `"attached"` → auto-discover services that mount `target_volume`

In hot mode, targets are restarted after sync. In cold mode, targets are stopped before sync and started after.

::: tip
If no targets are resolved (omitted or none attached), Dockform proceeds without restarts.
:::

### `apply_mode` <Badge type="tip" text="optional" />
* Type: `String`  
* Default: `"hot"`

Controls how file changes are applied. Can be `"hot"` (sync files while containers run, then restart targets if any) or `"cold"` (stop targets, sync files, then start targets). See [Filesets](/manifest/filesets#apply-modes) for details.

### `exclude` <Badge type="tip" text="optional" />
* Type: `Array`  
* Default: `null`

List of files or folders to ignore. Paths matching any entry will not be copied to the volume.