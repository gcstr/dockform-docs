---
title: Getting Started
icon: lucide/tv-minimal-play
---

# Getting Started

This guide will help you set up Dockform, initialize your first project, and understand the project structure that enables automatic discovery.

## Installation

### Prerequisites

Before you begin, make sure you have the following installed:

- [Docker](https://www.docker.com/) with Docker Compose
- [SOPS](https://github.com/getsops/sops) and [Age](https://github.com/FiloSottile/age) (for secrets management)
- [Go](https://go.dev/) (optional, for building from source)

### Homebrew

On macOS or Linux, install Dockform using [Homebrew](https://brew.sh/):

```bash
brew tap gcstr/dockform
brew install dockform
```

### Go Install

```bash
go install github.com/gcstr/dockform@latest
```

### Precompiled Binaries

Download binaries for Linux, macOS, and Windows from [GitHub Releases](https://github.com/gcstr/dockform/releases).

---

## Initialize a Project

Dockform includes a convenience command to scaffold a new project:

```bash
dockform init
```

This creates a starter `dockform.yml` manifest file.

## Project Structure

Dockform v0.8 uses **automatic discovery** based on your directory structure. Organize your project like this:

```
my-project/
├── dockform.yml          # Manifest file
├── default/              # Context directory (matches Docker context name)
│   ├── web/              # Stack: default/web
│   │   ├── compose.yaml
│   │   ├── environment.env
│   │   └── volumes/
│   │       └── static/
│   │           └── index.html
│   ├── api/              # Stack: default/api
│   │   └── compose.yaml
│   └── db/               # Stack: default/db
│       └── compose.yaml
```

### Key Conventions

| Directory/File | Purpose |
|----------------|---------|
| `<context>/` | Directory matching your Docker context name |
| `<context>/<stack>/` | Each subdirectory is a stack |
| `compose.yaml` | Compose file (auto-discovered) |
| `environment.env` | Environment variables (auto-discovered) |
| `secrets.env` | SOPS-encrypted secrets (auto-discovered) |
| `volumes/` | Filesets directory (auto-discovered) |

### Minimal Manifest

With the directory structure above, your manifest can be as simple as:

```yaml title="dockform.yml"
identifier: my-project

contexts:
  default: {}
```

Dockform automatically discovers all stacks in `default/`.

## Quick Start Example

### 1. Create Project Structure

```bash
mkdir -p my-project/default/web
cd my-project
```

### 2. Create Compose File

```yaml title="default/web/compose.yaml"
services:
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
```

### 3. Create Manifest

```yaml title="dockform.yml"
identifier: quickstart

contexts:
  default: {}
```

### 4. Preview Changes

```bash
dockform plan
```

Output:
```
│ Identifier:  quickstart
│ Contexts:    default

Stacks
  default/web
    ↑ nginx will be created

Plan: 1 to create, 0 to change, and 0 to destroy
```

By default, `plan` and `apply` show a **changes-only** view: resources that are
already up to date are collapsed into a per-section `N unchanged` count instead of
being listed line by line. This keeps the output readable on large, multi-context
setups. When nothing needs to change, you'll simply see:

```
No changes. 3 resources up to date.
```

Pass `--long` to `plan` or `apply` to print the full list, including every
unchanged resource.

### 5. Apply

```bash
dockform apply
```

Your nginx container is now running at http://localhost:8080

## Adding Resources

### Volumes

Add volumes under your context:

```yaml title="dockform.yml"
identifier: my-project

contexts:
  default:
    volumes:
      app-data: {}
```

Reference in Compose as `external`:

```yaml title="default/web/compose.yaml"
services:
  app:
    image: myapp
    volumes:
      - app-data:/data

volumes:
  app-data:
    external: true
```

### Networks

Add networks under your context:

```yaml title="dockform.yml"
identifier: my-project

contexts:
  default:
    networks:
      frontend:
        driver: bridge
```

Reference in Compose as `external`:

```yaml title="default/web/compose.yaml"
services:
  app:
    image: myapp
    networks:
      - frontend

networks:
  frontend:
    external: true
```

### Filesets

Create a `volumes/` directory in your stack:

```
default/web/
├── compose.yaml
└── volumes/
    └── config/
        └── nginx.conf
```

The `config` fileset is auto-discovered and synced to a `config` volume.

### Stack Augmentation

Add profiles or extra environment to discovered stacks:

```yaml title="dockform.yml"
identifier: my-project

contexts:
  default: {}

stacks:
  default/web:
    profiles: [production]
    environment:
      inline:
        - DEBUG=false
```

## Commands Cheatsheet

| Command | Description |
|---------|-------------|
| `dockform plan` | Preview changes |
| `dockform apply` | Apply changes |
| `dockform destroy` | Remove all managed resources |
| `dockform validate` | Validate manifest |
| `dockform doctor` | Check environment |
| `dockform dashboard` | Interactive TUI |

## Next Steps

- [The Manifest File](../manifest/overview/) – Full schema reference
- [Stacks](../manifest/stacks/) – Stack discovery and augmentation
- [Secrets](../manifest/secrets/) – SOPS encryption setup
- [Best Practices](../more/best_practices/) – Production recommendations

!!! tip "Migrating from v0.7?"
    See the [Migration Guide](migration_v08.md) for step-by-step instructions.
