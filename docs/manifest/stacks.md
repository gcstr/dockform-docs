---
title: Stacks
icon: lucide/layers
---

# Stacks

Stacks are Docker Compose projects that Dockform manages. In v0.8, stacks are **discovered automatically** from your directory structure, with optional augmentation via the manifest.

- **Discovery-first**: Dockform finds stacks from `<context>/<stack>/` directories containing compose files
- **Compose-first**: Dockform reads and runs your existing Compose files; it doesn't replace them
- **Inline labeling**: During `apply`, Dockform injects the `io.dockform.identifier` label into services
- **Augmentation**: The `stacks:` block adds configuration that can't be discovered (profiles, extra env, secrets)

## Automatic Discovery

Dockform discovers stacks by scanning directories that match your defined contexts:

```
my-project/
├── dockform.yml
├── default/              # ← Context "default"
│   ├── web/              # ← Stack "default/web"
│   │   ├── compose.yaml  # ← Discovered
│   │   ├── environment.env  # ← Auto-loaded
│   │   └── secrets.env   # ← Auto-loaded (SOPS)
│   ├── api/              # ← Stack "default/api"
│   │   └── compose.yaml
│   └── db/               # ← Stack "default/db"
│       └── compose.yaml
└── production/           # ← Context "production"
    └── traefik/          # ← Stack "production/traefik"
        └── compose.yaml
```

With this structure, a minimal manifest is all you need:

```yaml
identifier: myapp

contexts:
  default: {}
  production: {}
```

Dockform automatically discovers all four stacks.

### What Gets Discovered

For each `<context>/<stack>/` directory, Dockform looks for:

| File | Purpose | Default Names |
|------|---------|---------------|
| Compose file | Stack definition | `compose.yaml`, `compose.yml`, `docker-compose.yaml`, `docker-compose.yml` |
| Environment file | Stack env vars | `environment.env` |
| Secrets file | SOPS-encrypted secrets | `secrets.env` |
| Volumes directory | Filesets | `volumes/` |

### Customizing Discovery

Customize the file names Dockform looks for:

```yaml
identifier: myapp

discovery:
  compose_files: [stack.yml, stack.yaml]
  environment_file: .env
  secrets_file: .secrets.env
  volumes_dir: data

contexts:
  default: {}
```

## Augmenting Discovered Stacks

The `stacks:` block **augments** discovered stacks with configuration that can't be inferred from the directory structure. It uses the `context/stack` key format:

```yaml
identifier: myapp

contexts:
  default: {}

stacks:
  default/web:
    profiles: [production, metrics]
    environment:
      inline:
        - DEBUG=false
        - LOG_LEVEL=info
    project:
      name: web-prod
  
  default/api:
    secrets:
      sops:
        - extra-secrets.env
```

### Augmentation Fields

| Field | Purpose | Example |
|-------|---------|---------|
| `profiles` | Compose profiles to activate | `[production, debug]` |
| `environment.inline` | Additional env vars | `[DEBUG=false]` |
| `environment.files` | Additional env files | `[extra.env]` |
| `secrets.sops` | Additional SOPS files | `[api-secrets.env]` |
| `project.name` | Override project name | `web-prod` |

!!! note "Discovery wins for core fields"
    The `stacks:` block adds to discovered stacks—it doesn't replace the discovered `root`, `files`, or base environment. Discovery determines *where* the stack is; augmentation adds *how* to run it.

## Fallback: Explicit Stacks

For non-standard setups, you can define stacks explicitly with `root` and `files`:

```yaml
identifier: myapp

contexts:
  default: {}

stacks:
  default/legacy-app:
    root: ./apps/legacy
    files:
      - docker-compose.yml
      - docker-compose.prod.yml
    profiles: [production]
```

This is useful when:

- Your directory structure doesn't match the `<context>/<stack>/` convention
- You need multiple compose files in a specific order
- You're migrating from v0.7 and haven't restructured yet

## Environment Merging

Dockform merges environment from multiple sources:

1. **Discovered `environment.env`** in the stack directory
2. **Augmented `environment.files`** from the `stacks:` block
3. **Augmented `environment.inline`** from the `stacks:` block

For duplicate keys, later sources win (inline > files > discovered).

## Secrets Integration

Secrets are loaded from:

1. **Discovered `secrets.env`** in the stack directory (SOPS-encrypted)
2. **Augmented `secrets.sops`** from the `stacks:` block

Secrets are decrypted at apply time and passed as environment variables—never written to disk.

## Service Detection and Reconciliation

During `plan`/`apply`, Dockform analyzes:

- **Planned services**: Uses `docker compose config --services` to list what should exist
- **Running services**: Uses `docker compose ps` to see what's running
- **Config hash**: Uses `docker compose config --hash <service>` for drift detection
- **Container labels**: Compares identifier and config hash on running containers

A service requires action if it:

- Is missing
- Has an identifier mismatch
- Has drifted configuration

## Apply Behavior

During `apply`, Dockform:

1. Labels compose services with `io.dockform.identifier: <identifier>`
2. Runs `docker compose up -d` with merged env files and inline env
3. Ensures containers carry the correct identifier label
4. Restarts services queued by filesets (if any)

## Multi-Context Stacks

With multi-context support, you can deploy different stacks to different Docker daemons:

```
my-project/
├── dockform.yml
├── local/
│   └── dev-app/
│       └── compose.yaml
├── staging/
│   ├── web/
│   │   └── compose.yaml
│   └── api/
│       └── compose.yaml
└── production/
    ├── web/
    │   └── compose.yaml
    ├── api/
    │   └── compose.yaml
    └── traefik/
        └── compose.yaml
```

```yaml
identifier: myapp

contexts:
  local: {}
  staging: {}
  production: {}

stacks:
  production/web:
    profiles: [production]
  production/api:
    profiles: [production]
```

Deploy selectively:

```bash
# Deploy all stacks in staging
dockform apply --context staging

# Deploy specific stack
dockform apply --stack production/web
```

## Example

=== "dockform.yaml"

    ```yaml
    identifier: staging

    contexts:
      default: {}

    stacks:
      default/web:
        profiles: [prod]
        environment:
          inline:
            - FEATURE_FLAG=true
        project:
          name: web-staging
    ```

=== "default/web/compose.yaml"

    ```yaml
    services:
      api:
        image: ghcr.io/example/api:latest
        environment:
          - FEATURE_FLAG
        profiles:
          - prod
    ```

=== "default/web/environment.env"

    ```env
    DATABASE_URL=postgres://localhost/app
    REDIS_URL=redis://localhost
    ```

- Run `dockform plan` to preview which services will be created/updated
- Run `dockform apply` to apply changes and run Compose
