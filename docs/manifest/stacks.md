---
title: Stacks
icon: lucide/layers
---

# Stacks

Stacks are Docker Compose projects that Dockform manages. Stacks are **discovered automatically** from your directory structure, with optional augmentation via the manifest.

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
| `secrets.sops` | Additional SOPS files | `[api-secrets.env]` |
| `project.name` | Override the Compose project name (see [Project names](#project-names)) | `web-prod` |
| `filesets` | Fileset overrides/declarations | See [Filesets](filesets.md) |

!!! note "Discovery wins for core fields"
    The `stacks:` block adds to discovered stacks; it doesn't replace the discovered `root`, `files`, or base environment. Discovery determines *where* the stack is; augmentation adds *how* to run it.

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
2. **Augmented `environment.inline`** from the `stacks:` block

For duplicate keys, inline values win over the discovered file.

## Secrets Integration

Secrets are loaded from:

1. **Discovered `secrets.env`** in the context directory (`<context>/secrets.env`), shared by every stack in that context
2. **Discovered `secrets.env`** in the stack directory
3. **Augmented `secrets.sops`** from the `stacks:` block, with paths relative to the stack directory

All of them are SOPS-encrypted dotenv files. For duplicate keys, the stack's own file wins over the context's. See [Secrets](secrets/index.md).

Secrets are decrypted at apply time and passed as environment variables, never written to disk. That includes the fully rendered compose document Dockform hands to `docker compose`: it contains the decrypted values, so Dockform pipes it to compose over stdin instead of writing a temporary file.

## Project names

Every stack runs as a Compose project. Dockform uses the same name `docker compose` would, resolved in this order:

1. `project.name` in the `stacks:` block
2. `COMPOSE_PROJECT_NAME` from the stack's environment
3. The top-level `name:` in the compose file
4. The stack's directory name

Dockform relies on this name to find a stack's containers and networks: when it prunes what a removed stack left behind, when `destroy --stack` picks what to remove, and when `images check` looks up a service's running container. If a targeted `destroy` can't resolve a stack's project name, it stops with an error instead of guessing.

## Bind mounts

Dockform refuses bind mounts that point into your project, because they break as soon as the Docker daemon is remote:

- **Relative bind mounts** (`./config:/app/config`) are rejected for every stack, local or remote. This covers the short form (quoted or not, with or without `:ro`) and the long form with `type: bind`.
- **On a remote context**, Dockform also checks the fully resolved compose document and rejects any bind source inside the manifest directory or the stack's root. That catches interpolated sources like `${CONFIG_DIR}/app`, absolute paths into your project, and mounts inside `include:`d files.

A remote daemon doesn't have your local files. When a bind source is missing, Docker creates it on the server as an empty directory, and the container starts against an empty folder instead of failing. Use a [fileset](filesets.md) to ship the files to a volume instead. The error message lists the offending mounts and the steps to move them.

Absolute paths that belong to the host, such as `/var/run/docker.sock` or `/srv/data`, are allowed.

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
- Has a stopped container (shown as `will be started`)

If any of these Docker calls fails, `plan` and `apply` stop with an error rather than guess. A failed `docker compose ps`, for example, is never read as "nothing is running".

## Apply Behavior

During `apply`, Dockform:

1. Renders the stack with `docker compose config` and adds the `io.dockform.identifier: <identifier>` label to its services and networks
2. Pipes that document to `docker compose up -d` over stdin, with merged env files and inline env
3. Ensures containers carry the correct identifier label
4. Restarts services queued by filesets (if any)

Compose stamps a `com.docker.compose.project.working_dir` label on every container it creates, and it normally records the directory `docker compose` ran from. On a remote host that would be a path from your own machine, so Dockform sets it to `/dockform/<identifier>/<project>` instead. This doesn't change the config hash, so upgrading doesn't recreate anything; containers pick up the new label the next time they're recreated for another reason.

## Removing a Stack

Delete a stack's directory (or its `stacks:` entry) and the next `plan` shows its containers and Compose networks as `will be deleted`. `apply` removes them. Dockform matches leftover containers by Compose project and service name, so removing a stack with a `web` service never touches another stack's `web`.

Pruning only happens on untargeted runs. With `--context`, `--stack` or `--deployment`, Dockform sees only part of your manifest, so it leaves everything outside that scope alone.

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

=== "dockform.yml"

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
