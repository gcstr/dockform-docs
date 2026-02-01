---
title: The Manifest File
icon: lucide/scan-eye
---

# The Manifest File

A Dockform manifest is a single YAML file that defines all resources needed for your Docker deployments. With it, you can declare contexts, stacks, environment variables, secrets, volumes, networks, and filesets in one place, making your infrastructure fully reproducible and declarative.

## Overview

Dockform v0.8 introduces **automatic discovery** and **multi-context support**. Your manifest can be as simple as:

```yaml
identifier: my-project

contexts:
  default: {}
```

With this minimal configuration, Dockform automatically discovers stacks from your directory structure.

## Full Schema Example

```yaml { .yaml .annotate }
identifier: my-project # (1)!

sops:
  age:
    key_file: ${AGE_KEY_FILE}
    recipients:
      - age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

discovery: # (2)!
  compose_files: [compose.yaml, docker-compose.yaml]
  secrets_file: secrets.env
  environment_file: environment.env
  volumes_dir: volumes

contexts: # (3)!
  default:
    volumes:
      app-data: {}
    networks:
      app-network:
        driver: bridge
        options:
          com.docker.network.bridge.enable_icc: "false"
  
  production:
    volumes:
      prod-data: {}
    networks:
      traefik: {}

stacks: # (4)!
  default/web:
    profiles: [production]
    environment:
      inline:
        - DEBUG=false
    project:
      name: web-staging

deployments: # (5)!
  staging:
    description: Deploy all staging stacks
    contexts: [default]
  prod:
    description: Deploy production only
    stacks: [production/web, production/api]
```

1. **identifier** is required and used to label all managed resources
2. **discovery** (optional) customizes how Dockform finds stacks and filesets
3. **contexts** maps Docker context names to their resource configurations
4. **stacks** (optional) augments discovered stacks with profiles, environment, secrets, or project name
5. **deployments** (optional) defines named groups for targeting specific contexts or stacks

## `identifier:`

| Type   | Default |    Required    |
| ------ | ------- |:--------------:|
| String | `null`  | :lucide-check: |

The identifier labels all resources managed by Dockform. It's used for:

- Docker labels: `io.dockform.identifier=<identifier>`
- Resource discovery and cleanup
- Compose project scoping

!!! danger "Important"
    Changing the `identifier` of an existing deployment will **not** update already deployed resources. Use `dockform destroy` first if you need to change identifiers.

## `contexts:`

| Type | Default |    Required    |
| ---- | ------- |:--------------:|
| Map  | `null`  | :lucide-check: |

The contexts map defines which Docker contexts (daemons) Dockform manages. Each key must match an existing [Docker Context](https://docs.docker.com/engine/manage-resources/contexts/).

```yaml
contexts:
  default: {}           # Local Docker daemon
  remote-server: {}     # Remote daemon via SSH
  production:
    volumes:
      app-data: {}
    networks:
      traefik: {}
```

??? tip "Creating remote contexts"
    To create a context for a remote daemon:

    ```bash
    docker context create \
      --docker host=ssh://user@server \
      --description="My remote server" \
      remote-server
    ```

### Context Resources

Each context can define:

- `volumes:` - Docker volumes to create
- `networks:` - Docker networks to create

```yaml
contexts:
  default:
    volumes:
      db-data: {}
      app-config: {}
    networks:
      frontend:
        driver: bridge
      backend:
        internal: true
```

## `discovery:`

| Type | Default                 |  Required  |
| ---- | ----------------------- |:----------:|
| Map  | (sensible defaults)     | :lucide-x: |

Discovery controls how Dockform automatically finds stacks and filesets from your directory structure. Discovery is **always enabled**; this block only customizes the patterns used.

```yaml
discovery:
  compose_files:    # Default: [compose.yaml, compose.yml, docker-compose.yaml, docker-compose.yml]
    - stack.yml
  secrets_file: .secrets.env      # Default: secrets.env
  environment_file: .env          # Default: environment.env
  volumes_dir: data               # Default: volumes
```

### How Discovery Works

Dockform scans directories matching your contexts:

```
my-project/
├── dockform.yml
├── default/              # ← Context "default"
│   ├── web/              # ← Stack "default/web"
│   │   ├── compose.yaml  # ← Compose file (discovered)
│   │   ├── environment.env  # ← Env file (discovered)
│   │   ├── secrets.env   # ← Secrets (discovered)
│   │   └── volumes/      # ← Filesets directory
│   │       └── config/   # ← Fileset "config"
│   └── api/
│       └── compose.yaml
└── production/           # ← Context "production"
    └── traefik/
        └── compose.yaml
```

## `stacks:`

| Type | Default |  Required  |
| ---- | ------- |:----------:|
| Map  | `null`  | :lucide-x: |

The stacks block **augments** discovered stacks. It does not create new stacks—it adds configuration to stacks found through discovery.

Stack keys use the format `context/stack`:

```yaml
stacks:
  default/web:
    profiles: [production, metrics]
    environment:
      inline:
        - LOG_LEVEL=debug
    project:
      name: web-prod
  
  production/api:
    secrets:
      sops:
        - api-secrets.env
```

### Augmentation Fields

| Field | Purpose |
|-------|---------|
| `profiles` | Compose profiles to activate |
| `environment.inline` | Additional environment variables |
| `environment.files` | Additional env files |
| `secrets.sops` | Additional SOPS-encrypted files |
| `project.name` | Override Compose project name |

!!! note
    Discovery sets `root`, `files`, and base `env-file`. The stacks block adds to these, it doesn't replace them.

## `sops:`

| Type | Default |  Required  |
| ---- | ------- |:----------:|
| Map  | `null`  | :lucide-x: |

Configures SOPS for secret decryption. Supports Age and PGP backends.

```yaml
sops:
  age:
    key_file: ${AGE_KEY_FILE}
    recipients:
      - age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
  pgp:
    keyring_dir: ~/.gnupg
    recipients:
      - 0xDEADBEEFCAFEBABE
```

See [Secrets Workflow](secrets/) for detailed setup.

## `deployments:`

| Type | Default |  Required  |
| ---- | ------- |:----------:|
| Map  | `null`  | :lucide-x: |

Deployments define named groups for targeting specific contexts or stacks with CLI commands.

```yaml
deployments:
  staging:
    description: Deploy all staging stacks
    contexts: [default]
  
  production:
    description: Deploy production services
    stacks:
      - production/web
      - production/api
      - production/traefik
```

Use with `--deployment` flag:

```bash
dockform apply --deployment staging
dockform plan --deployment production
```

## Project Structure

A typical Dockform v0.8 project:

```
my-project/
├── dockform.yml          # Manifest file
├── default/              # Context: default (local Docker)
│   ├── web/              # Stack: default/web
│   │   ├── compose.yaml
│   │   ├── environment.env
│   │   └── volumes/
│   │       └── static/   # Fileset: synced to volume
│   ├── api/
│   │   └── compose.yaml
│   └── traefik/
│       ├── compose.yaml
│       └── volumes/
│           └── config/
└── production/           # Context: production (remote)
    └── web/
        └── compose.yaml
```

## Minimal vs Full Example

=== "Minimal"

    ```yaml
    identifier: myapp
    
    contexts:
      default: {}
    ```
    
    Dockform discovers all stacks from `default/*/compose.yaml`.

=== "Full"

    ```yaml
    identifier: myapp
    
    sops:
      age:
        key_file: ${AGE_KEY_FILE}
    
    contexts:
      default:
        volumes:
          app-data: {}
        networks:
          traefik: {}
      production:
        volumes:
          prod-data: {}
    
    stacks:
      default/web:
        profiles: [debug]
        environment:
          inline:
            - DEBUG=true
      production/web:
        profiles: [production]
    
    deployments:
      dev:
        contexts: [default]
      prod:
        contexts: [production]
    ```
