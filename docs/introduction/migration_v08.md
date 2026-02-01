---
title: Migrating to v0.8
icon: lucide/arrow-up-circle
---

# Migrating from v0.7 to v0.8

Dockform v0.8 introduces **multi-context support** and **automatic discovery**, making manifests simpler and more powerful. This guide walks you through the key changes and how to migrate your existing configuration.

## What's New in v0.8

- **Multi-context support**: Deploy to multiple Docker daemons from a single manifest
- **Automatic discovery**: Stacks and filesets are discovered from directory structure
- **Simplified schema**: Less boilerplate, more convention-over-configuration
- **Context-scoped resources**: Volumes and networks are defined per context

## Schema Changes at a Glance

| v0.7 | v0.8 |
|------|------|
| `docker.context: default` | `contexts: { default: {} }` |
| `docker.identifier: myapp` | `identifier: myapp` (top-level) |
| `volumes:` (root level) | `contexts.<name>.volumes:` |
| `networks:` (root level) | `contexts.<name>.networks:` |
| `stacks.web.root: ./web` | Discovered from `default/web/` directory |
| `filesets:` (root level) | Discovered from `<context>/<stack>/volumes/` |

## Step-by-Step Migration

### 1. Move `identifier` to Top Level

**Before (v0.7):**
```yaml
docker:
  context: default
  identifier: myapp
```

**After (v0.8):**
```yaml
identifier: myapp

contexts:
  default: {}
```

### 2. Convert `docker.context` to `contexts` Map

The single `docker.context` is now a map under `contexts:`. The key is the Docker context name.

**Before (v0.7):**
```yaml
docker:
  context: remote-server
  identifier: myapp
```

**After (v0.8):**
```yaml
identifier: myapp

contexts:
  remote-server: {}
```

### 3. Move Volumes and Networks Under Contexts

Resources are now scoped to their context.

**Before (v0.7):**
```yaml
docker:
  context: default
  identifier: myapp

volumes:
  app-data: {}
  
networks:
  app-net:
    driver: bridge
```

**After (v0.8):**
```yaml
identifier: myapp

contexts:
  default:
    volumes:
      app-data: {}
    networks:
      app-net:
        driver: bridge
```

### 4. Restructure Your Project for Discovery

Dockform v0.8 automatically discovers stacks from your directory structure. Organize your project like this:

```
my-project/
├── dockform.yml
├── default/              # Context name
│   ├── web/              # Stack name
│   │   ├── compose.yaml
│   │   ├── environment.env  # Auto-discovered
│   │   └── secrets.env      # Auto-discovered (SOPS)
│   ├── api/
│   │   └── compose.yaml
│   └── db/
│       └── compose.yaml
```

With this structure, you don't need to declare stacks in the manifest at all:

```yaml
identifier: myapp

contexts:
  default: {}
```

Dockform will automatically discover `default/web`, `default/api`, and `default/db` as stacks.

### 5. Update Stack Keys (If Using Explicit Stacks)

If you need to augment discovered stacks, use the `context/stack` format:

**Before (v0.7):**
```yaml
stacks:
  web:
    root: ./web
    profiles: [production]
```

**After (v0.8):**
```yaml
stacks:
  default/web:
    profiles: [production]
```

!!! note
    The `stacks:` block is now optional and only used to augment discovered stacks with `profiles`, `environment`, `secrets`, or `project` settings.

### 6. Convert Filesets to Directory Convention

Filesets are now discovered automatically from `volumes/` directories inside each stack.

**Before (v0.7):**
```yaml
filesets:
  nginx-config:
    source: ./config
    target_volume: nginx_config
    target_path: /etc/nginx
    restart_services: [nginx]
```

**After (v0.8):**

Create a `volumes/` directory inside your stack:

```
default/web/
├── compose.yaml
└── volumes/
    └── nginx-config/        # Fileset name
        ├── nginx.conf
        └── sites/
```

Then reference it in your compose file as an external volume.

## Complete Migration Example

### Before (v0.7)

```yaml
docker:
  context: default
  identifier: staging

environment:
  files:
    - global.env

sops:
  age:
    key_file: ${AGE_KEY_FILE}

volumes:
  app-data: {}
  traefik-config: {}

networks:
  traefik:
    driver: bridge

stacks:
  web:
    root: ./web
    files:
      - docker-compose.yaml
    profiles: [production]
    environment:
      inline:
        - DEBUG=false
  api:
    root: ./api

filesets:
  traefik:
    source: ./traefik/config
    target_volume: traefik-config
    target_path: /etc/traefik
    restart_services: [traefik]
```

### After (v0.8)

**Project structure:**
```
my-project/
├── dockform.yml
├── default/
│   ├── web/
│   │   ├── compose.yaml
│   │   └── environment.env
│   ├── api/
│   │   └── compose.yaml
│   └── traefik/
│       ├── compose.yaml
│       └── volumes/
│           └── config/
│               └── traefik.yaml
```

**dockform.yml:**
```yaml
identifier: staging

sops:
  age:
    key_file: ${AGE_KEY_FILE}

contexts:
  default:
    volumes:
      app-data: {}
    networks:
      traefik:
        driver: bridge

# Only needed for non-discoverable settings
stacks:
  default/web:
    profiles: [production]
    environment:
      inline:
        - DEBUG=false
```

## Optional: Customize Discovery

If your project uses non-standard file names, customize discovery:

```yaml
identifier: myapp

discovery:
  compose_files: [stack.yml, stack.yaml]  # Default: compose.yaml, docker-compose.yaml
  secrets_file: .secrets.env              # Default: secrets.env
  environment_file: .env                  # Default: environment.env
  volumes_dir: data                       # Default: volumes

contexts:
  default: {}
```

## Multi-Context Deployments

v0.8 supports deploying to multiple Docker contexts:

```yaml
identifier: myapp

contexts:
  local:
    volumes:
      dev-data: {}
  production:
    volumes:
      app-data: {}
    networks:
      traefik: {}
```

With directory structure:
```
my-project/
├── dockform.yml
├── local/
│   └── dev-app/
│       └── compose.yaml
└── production/
    ├── web/
    │   └── compose.yaml
    └── traefik/
        └── compose.yaml
```

## Breaking Changes Summary

| Change | Action Required |
|--------|-----------------|
| `docker:` block removed | Move `identifier` to top level, convert `context` to `contexts` map |
| `volumes:` at root | Move under `contexts.<name>.volumes:` |
| `networks:` at root | Move under `contexts.<name>.networks:` |
| `stacks.<name>.root` | Restructure directories or use explicit `root:` as fallback |
| `filesets:` at root | Move to `<context>/<stack>/volumes/` directories |

## Need Help?

If you encounter issues during migration:

1. Run `dockform validate` to check your manifest
2. Run `dockform plan` to preview what will be deployed
3. Check the [Manifest Overview](/manifest/overview/) for detailed schema documentation
