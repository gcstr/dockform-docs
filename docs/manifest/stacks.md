---
title: Stacks
---

# Stacks

Stacks define where your Compose project lives and how Dockform should run it.
Each stack points to a folder (`root`) that contains your compose files and optional env files.

- **Compose-first**: Dockform reads and runs your existing Compose files; it doesn’t replace them.
- **Inline labeling**: during `apply`, Dockform injects the `io.dockform.identifier` label into services to scope what it manages.
- **Deterministic**: env files and inline env are merged with clear precedence; defaults are filled consistently.

## Defining stacks

Each key under `stacks:` defines one app. Minimum required field is `root`.
If `files` is omitted, Dockform uses `docker-compose.yaml` (or `.yml`) in that folder.

```yaml [dockform.yaml]
docker:
  context: default
  identifier: staging

environment:
  files:
    - ./global.env
  inline:
    - GLOBAL_ENV=global

stacks:
  web:
    root: ./web
    files:
      - docker-compose.yaml
    profiles: [prod]
    env-file:
      - ./.env
    environment:
      files: [./web.env]
      inline:
        - PORT=8080
    project:
      name: web-staging
```

### Fields

- `root` (required): folder where Compose files are resolved and commands run.
- `files` (optional): list of Compose files relative to `root` (overlays allowed in Compose semantics).
- `profiles` (optional): Compose profiles to enable.
- `env-file` (optional): additional env files for Compose (relative to `root`).
- `environment` (optional): per-app env definitions, with `files` and `inline`.
- `secrets.sops` (optional): per-app SOPS-encrypted `.env` files for inline injection at runtime. *(See [Secrets](secrets/secrets.md))*
- `project.name` (optional): Compose project name override.

## Environment merging and precedence

Dockform merges environment from root-level and app-level before invoking Compose.

- Root-level `environment.files` paths are rebased from the manifest location to be relative to each app `root`.
- Final `env-file` list passed to Compose is the de-duplicated concatenation of: root `environment.files`, app `environment.files`, and app `env-file`.
- Inline environment is merged root-first then app; for duplicate keys, the later value wins (last-wins dedup).
- `secrets.sops` from both root and app are loaded at apply-time, decrypted, and appended as inline env pairs.

## Service detection and reconciliation

At `plan`/`apply` time Dockform analyzes:

- Planned services using `docker compose config`/`--services` to list what should exist.
- Running services via `docker compose ps`.
- Desired config hash for each service via `docker compose config --hash <service>`.
- Container labels on running services to compare the identifier and config hash.

A service requires action if it is missing, has an identifier mismatch, or has drifted config.

## Apply behavior

During `apply`, Dockform:

1. Labels compose services with `io.dockform.identifier: <docker.identifier>` using a temporary overlay when hashing or bringing up services.
2. Runs `docker compose up -d` with merged env files and inline env.
3. Ensures containers carry the correct identifier label (post-check and fix if needed).
4. Restarts services queued by filesets after compose changes (if any).

## End-to-end example

::: code-group

```yaml [dockform.yaml]
docker:
  context: default
  identifier: staging

environment:
  files: [./global.env]
  inline:
    - GLOBAL_ENV=global

stacks:
  app:
    root: ./app
    files: [docker-compose.yaml]
    env-file: [.env]
    environment:
      files: [./app.env]
      inline:
        - FEATURE_FLAG=true
    project:
      name: app-staging
```

```yaml [app/docker-compose.yaml]
services:
  api:
    image: ghcr.io/example/api:latest
    environment:
      - FEATURE_FLAG
      - GLOBAL_ENV
```

:::

- Run `dockform plan` to preview which services will be created/updated.
- Run `dockform apply` to apply changes and run Compose.