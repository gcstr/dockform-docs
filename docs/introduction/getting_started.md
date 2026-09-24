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
- [Go](https://go.dev/) (optional, for `go install`)

### Homebrew

On macOS or Linux, install Dockform using [Homebrew](https://brew.sh/):

```bash
brew install gcstr/dockform/dockform
```

Using the full `gcstr/dockform/dockform` name adds the tap and trusts just this formula, which Homebrew 6 and later require for third-party taps. After that, `brew upgrade dockform` keeps it up to date.

### Go Install

```bash
go install github.com/gcstr/dockform/cmd/dockform@latest
```

### Precompiled Binaries

Download a `.tar.gz` archive for Linux or macOS (amd64 or arm64) from [GitHub Releases](https://github.com/gcstr/dockform/releases) and put the `dockform` binary on your `PATH`:

```bash
VERSION=v0.10.0
curl -sSL "https://github.com/gcstr/dockform/releases/download/${VERSION}/dockform_${VERSION}_linux_amd64.tar.gz" | tar -xz dockform
sudo mv dockform /usr/local/bin/
```

Windows isn't supported.

---

## Initialize a Project

Dockform includes a convenience command to scaffold a new project:

```bash
dockform init
```

This creates a starter `dockform.yml` manifest file and adds `.dockform/` to your `.gitignore` (Dockform keeps volume snapshots and apply logs there).

## Project Structure

Dockform uses **automatic discovery** based on your directory structure. Organize your project like this:

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
| `<context>/` | Directory matching a context name from your manifest |
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
│ Context:     default

default
  Stacks
    web
      ↑ nginx will be created

Plan: 1 to create, 0 to change, and 0 to destroy
```

The plan is grouped by Docker context, then by section (volumes, networks,
stacks, filesets). By default, `plan` and `apply` show a **changes-only** view:
resources that are already up to date are left out, and so are contexts and
sections with nothing to do. This keeps the output readable on large,
multi-context setups. When nothing needs to change, you'll simply see:

```
No changes. 3 resources up to date.
```

Pass `--long` to `plan` or `apply` to print the full list, including every
unchanged resource.

### 5. Apply

```bash
dockform apply
```

`apply` shows the plan, asks you to confirm, and then shows one line per
resource that updates as the work happens. Stacks expand into their services,
with image pull progress and waits on health checks, and finished groups fold
into a one-line summary:

```
Applying 1 resource
default stack web: starting
default service web/nginx: pulling
default service web/nginx: creating…
default service web/nginx: starting…
default service web/nginx: created (4.0s)
default stack web: started (4.2s)

1 of 1 resource applied, 0 failed
  log: /path/to/my-project/.dockform/logs/apply-20260924-114328.log
```

That's the plain form you get when the output isn't a terminal, or with
`--verbose`; in a terminal the same lines update in place. The last line points
to the run's full log (see [Run logs](../more/debugging.md#run-logs)).

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

The `config` fileset is auto-discovered and synced to a volume named `web_config` (`<stack>_<fileset>`). Reference that name as an `external` volume in your compose file.

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
