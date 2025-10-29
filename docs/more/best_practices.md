---
title: Best Practices
---

# Best Practices

This guide collects practical recommendations for using Dockform safely and effectively across development, staging, and production.

## Core principles

- Treat the manifest file as *the* source of truth; avoid imperative Docker commands.
- Scope everything with a clear `docker.identifier` (e.g., `server-name`).
- Prefer small, focused changes and review with `dockform plan` before `apply`.

## Volumes

- Declare named volumes in the manifest under `volumes:` and reference them as `external` in Compose. ***Avoid defining named volumes directly in Compose***.
- Back up volumes regularly. Dockform’s `destroy` (and `prune`) can remove labeled volumes. Consider a backup solution like [docker-volume-backup](https://offen.github.io/docker-volume-backup/).
- If a fileset targets a volume, you may omit it from `volumes:` (it will be created), but listing it explicitly improves readability.

## Networks

- Declare networks in the manifest and reference them as `external` in Compose. Avoid creating ad-hoc networks via Compose.
- Use environment-specific names if you need strict isolation per environment.

## Filesets

- Use filesets for configs and static assets (not for very large, frequently-changing data).
- Keep `target_path` specific (never `/`), and use `exclude` to avoid syncing build artifacts, VCS metadata, and OS files.
- Set `restart_services` only for services that actually need a restart.

Example excludes:

```yaml [dockform.yaml]
filesets:
  app-config:
    source: ./config
    target_volume: app-config
    target_path: /etc/app
    exclude:
      - ".git/"
      - "**/*.tmp"
      - "**/.DS_Store"
```

## Stacks and Compose

- Set a stable `project.name` for predictable container and network names. See https://docs.docker.com/compose/how-tos/project-name/
- Keep Compose files close to each app’s `root` folder; avoid cross-tree paths.
- Use Compose profiles for environment-specific toggles (e.g., `prod` vs `dev`).
- Let Dockform inject its identifier label; do not hardcode `io.dockform.identifier` in Compose.

## Environment and secrets

- Use root `environment.files` for shared files and app-level `environment.files` for overrides; Dockform rebases root paths to the app `root`.
- Prefer SOPS-encrypted `.env` files for secrets. Keep keys outside of the repo and load via `${AGE_KEY_FILE}`.
- If not using SOPS, inject secrets via CI as environment variables and pass them through Compose `environment:`.
- Prefer storing secrets with SOPS and commit encrypted files.
- Use `dockform doctor` to quickly audit your environment:
  - Verifies SOPS is installed.
  - Checks GnuPG presence and reports loopback support and agent socket when available.
- For GPG CI/headless runners, consider SOPS GPG loopback (`pinentry_mode: loopback`) with a short‑lived passphrase from your CI secret store.

<!-- ## CI/CD recommendations

- Use `dockform plan` in PRs to preview changes; require approval before `apply`.
- Pin the Docker context and set a clear `docker.identifier` per environment.
- Provide required env vars (including SOPS keys if used) via CI secrets.
- For ephemeral tests, set `DOCKFORM_RUN_ID` to isolate resources, then run `dockform destroy` or `prune` at the end. -->

## Safety and destructive operations

Always ensure you have recent backups for stateful volumes before destructive commands.

::: warning

`destroy` removes all labeled resources for the active identifier (containers, networks, volumes). Use with care.

:::

## Performance and determinism

- Limit fileset sizes and use `exclude` aggressively for large repos.
- Keep Compose and manifest changes minimal per deployment for faster diffs.
- Prefer stable project and resource names to minimize churn and restarts.

## Suggested project structure

- Dockform is unopinionated, but grouping stacks by folder is effective.

```text
repo/
  dockform.yaml
  traefik/
    docker-compose.yaml
    config/
  app/
    docker-compose.yaml
    .env
  db/
    docker-compose.yaml
```

## Troubleshooting tips

- If Compose fails, run `docker compose -f <file> config` to validate YAML.
- If a service doesn’t update, check labels and config-hash drift; then run `dockform plan`.
- If a volume/network is “missing” in Compose, ensure it is declared in the manifest and referenced as `external` with the correct name.

