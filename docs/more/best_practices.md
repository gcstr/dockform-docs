---
title: Best Practices
icon: lucide/award
---

# Best Practices

This guide collects practical recommendations for using Dockform v0.8 safely and effectively across development, staging, and production environments.

## Core Principles

- Treat the manifest file as *the* source of truth; avoid imperative Docker commands
- Use a clear, stable `identifier` (e.g., `myapp`, `server-name`)
- Leverage automatic discovery—structure directories, minimize manifest config
- Prefer small, focused changes and review with `dockform plan` before `apply`

## Project Structure

Follow the discovery convention for automatic stack detection:

```
my-project/
├── dockform.yml
├── default/              # Context name
│   ├── traefik/          # Stack: default/traefik
│   │   ├── compose.yaml
│   │   └── volumes/
│   │       └── config/
│   ├── web/              # Stack: default/web
│   │   ├── compose.yaml
│   │   ├── environment.env
│   │   └── secrets.env
│   └── db/
│       └── compose.yaml
└── production/           # Another context
    └── web/
        └── compose.yaml
```

**Recommendations:**

- Name context directories to match Docker context names
- Keep one Compose file per stack (use profiles for variants)
- Store filesets in `volumes/` subdirectories within each stack
- Use `environment.env` and `secrets.env` for auto-discovery

## Contexts and Multi-Host

- Define one context per Docker daemon (local, staging, production)
- Use Docker contexts for remote daemons via SSH
- Keep context-specific resources (volumes, networks) under that context

```yaml
contexts:
  local:
    volumes:
      dev-data: {}
  staging:
    volumes:
      staging-data: {}
  production:
    volumes:
      prod-data: {}
    networks:
      traefik: {}
```

??? tip "Creating remote contexts"
    ```bash
    docker context create production \
      --docker host=ssh://user@server \
      --description="Production server"
    ```

## Volumes

- Declare named volumes under `contexts.<name>.volumes:`
- Reference them as `external: true` in Compose files
- **Avoid** defining named volumes directly in Compose—let Dockform manage them
- Regularly backup volumes; `destroy` and `prune` will remove labeled volumes

```yaml
contexts:
  default:
    volumes:
      app-data: {}
      cache: {}
```

```yaml title="compose.yaml"
volumes:
  app-data:
    external: true
```

## Networks

- Declare networks under `contexts.<name>.networks:`
- Reference them as `external: true` in Compose files
- Use environment-specific network names for strict isolation
- Dockform detects drift and recreates networks when configuration changes

```yaml
contexts:
  default:
    networks:
      frontend:
        driver: bridge
      backend:
        internal: true
```

## Filesets

- Use the `volumes/` directory convention for auto-discovery
- Keep filesets focused—configs, static assets, seeds (not large data)
- Use `.dockform-exclude` files to skip build artifacts, VCS metadata, OS files
- Set ownership via `.dockform-ownership.yaml` when needed

```
default/web/volumes/
├── config/
│   ├── .dockform-exclude
│   └── nginx.conf
└── static/
    ├── index.html
    └── styles.css
```

Example exclude file:

```title=".dockform-exclude"
.git/
**/*.tmp
**/.DS_Store
node_modules/
```

## Stacks and Discovery

- Let discovery find your stacks—minimize explicit `stacks:` entries
- Use `stacks:` only for augmentation: profiles, extra env, secrets, project name
- Set a stable `project.name` for predictable container naming

```yaml
stacks:
  default/web:
    profiles: [production]
    project:
      name: web-prod
```

## Environment and Secrets

- Use `environment.env` in stack directories for auto-discovery
- Add stack-specific overrides via `stacks.<key>.environment.inline`
- Keep secrets in `secrets.env` (SOPS-encrypted) for auto-discovery
- Never commit unencrypted secrets; always use SOPS

```yaml
sops:
  age:
    key_file: ${AGE_KEY_FILE}
```

- Use `dockform doctor` to verify SOPS and key configuration
- For CI/CD, inject key files via secrets management

## Deployments

Use deployment groups for targeting specific environments:

```yaml
deployments:
  dev:
    description: Local development
    contexts: [local]
  
  staging:
    description: Staging environment
    contexts: [staging]
  
  production:
    description: Production services
    stacks:
      - production/web
      - production/api
      - production/traefik
```

```bash
dockform apply --deployment staging
dockform plan --deployment production
```

## CI/CD Recommendations

- Use `dockform plan` in PRs to preview changes; require approval before `apply`
- Pin the Docker context and set a clear identifier per environment
- Provide required env vars (including SOPS keys) via CI secrets
- Run `dockform validate` as a pre-check step

```yaml title=".github/workflows/deploy.yml"
jobs:
  deploy:
    steps:
      - uses: actions/checkout@v4
      - name: Validate manifest
        run: dockform validate
      - name: Plan changes
        run: dockform plan --deployment ${{ github.event.inputs.environment }}
      - name: Apply changes
        run: dockform apply --deployment ${{ github.event.inputs.environment }} --skip-confirmation
```

## Safety and Destructive Operations

!!! danger
    `destroy` removes **all** labeled resources for the active identifier (containers, networks, volumes). Use with care and ensure backups exist.

- Always run `dockform plan` before `apply` to review changes
- Keep recent backups for stateful volumes before destructive commands
- Consider using [docker-volume-backup](https://offen.github.io/docker-volume-backup/) for automated backups

## Performance

- Keep fileset sizes reasonable; use `.dockform-exclude` aggressively
- Minimize changes per deployment for faster diffs
- Use stable project and resource names to reduce churn and restarts

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Compose fails | Run `docker compose -f <file> config` to validate YAML |
| Service doesn't update | Check labels and config-hash drift with `dockform plan` |
| Volume/network missing in Compose | Ensure declared in manifest and referenced as `external` |
| Stack not discovered | Verify directory structure matches `<context>/<stack>/compose.yaml` |
| Secrets not decrypted | Run `dockform doctor` to check SOPS configuration |

## Quick Reference

| Command | Purpose |
|---------|---------|
| `dockform plan` | Preview changes before applying |
| `dockform apply` | Apply changes to infrastructure |
| `dockform destroy` | Remove all managed resources |
| `dockform validate` | Validate manifest syntax |
| `dockform doctor` | Check environment and dependencies |
| `dockform dashboard` | Interactive TUI for monitoring |
