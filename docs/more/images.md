---
title: Image Management
icon: lucide/container
---

# Image Management

The `dockform images` subcommands check, pull, and upgrade container images referenced across your stacks. They answer two questions:

- Is the image tag I'm using still the newest one that matches my policy?
- Did the image behind my tag change on the registry?

You configure tag policy per service with a single compose label. Everything else works from what is already in your compose files.

## How It Works

For every service in scope Dockform looks at the image reference in your compose file (for example `nginx:1.27-alpine`) and queries the registry.

- **Digest check** compares the registry digest for that exact tag against the digest of the container currently running on the daemon. If they differ, the tag is still the same but the content behind it changed.
- **Tag check** lists the tags published for the image and reports any that are newer than the one you are running, using a regex you supply per service.

No access to private Dockform state, no background daemon. The tool reads your compose files and talks to the registry.

## Configuring Tag Patterns

Tag checks need a regex so Dockform knows which tags to consider and how to order them. Set it on the service with the `dockform.tag_pattern` label in your compose file:

```yaml
services:
  web:
    image: nginx:1.27-alpine
    labels:
      dockform.tag_pattern: "^\\d+\\.\\d+-alpine$"

  traefik:
    image: traefik:v3.6.12
    labels:
      dockform.tag_pattern: "^v\\d+\\.\\d+\\.\\d+$"

  app:
    image: ghcr.io/example/app:2026.4.0
    labels:
      dockform.tag_pattern: "^\\d{4}\\.\\d+\\.\\d+$"
```

The pattern is a Go regex applied to each tag returned by the registry. Any tag that matches and parses as a version newer than the one in use is reported.

A service without a `dockform.tag_pattern` label still gets the digest check. Dockform just won't look for newer tags for it, and reports those rows with a `no tag_pattern` note.

!!! warning "Escape `$` in compose files"
    Docker Compose interprets `$` as the start of a variable. To get a literal `$` into the label, double it: `$$` in the compose file becomes `$` at runtime.

    ```yaml
    labels:
      dockform.tag_pattern: "^\\d+\\.\\d+\\.\\d+$$"
    ```

    Without the doubling, Compose either eats the `$` or errors out on an unknown variable.

    Because Dockform reads the pattern *after* Compose interpolation, a lone `$`
    is already gone by the time it's seen, so the pattern silently matches the
    wrong tags. To catch this, `dockform images check` **warns** when a
    `tag_pattern` isn't anchored with a trailing `$` (a missed escape).
    If your pattern is intentionally unanchored, you can ignore the warning.

## Commands

### `dockform images check`

Report image freshness across all stacks (or a subset):

```bash
dockform images check
```

Attention rows are shown by default. Pass `--all` to also see services that are up to date. `--json` emits structured output for piping into other tools.

Scope the check with the standard flags and with positional service names:

```bash
# Everything in one stack
dockform images check --stack production/web

# One service in one stack
dockform images check app --stack production/web

# The same service wherever it appears across contexts
dockform images check postgres

# Multiple services in one stack
dockform images check app worker --stack production/web
```

A positional name that doesn't match anything in scope fails with a list of what is available. Typos don't silently no-op.

### `dockform images pull`

Fetches images whose registry digest moved under the same tag. Useful when you're following a floating tag like `:latest` or `:1` and want the new content pulled down.

```bash
# Pull any digest-drifted images
dockform images pull

# Pull and recreate affected containers so the new image is actually running
dockform images pull --recreate

# Preview without pulling
dockform images pull --dry-run
```

Without `--recreate`, the image is downloaded on the daemon but existing containers keep running the old one until they're restarted.

### `dockform images upgrade`

Rewrites image tags in your compose files to the newest tag that matches each service's `dockform.tag_pattern`. The change lands in your repo, not on the daemon:

```bash
# Update tags on disk
dockform images upgrade

# Preview the rewrites
dockform images upgrade --dry-run
```

After `upgrade`, your working tree has edits. Review them, commit them, then run `dockform apply` to roll the new tags out to the daemon. This keeps image updates on the same plan/apply rails as any other change.

Services with no `dockform.tag_pattern` are skipped by `upgrade`: Dockform won't pick a "newest" tag for you when you haven't told it what shape tags take.

## A Typical Workflow

1. Add `dockform.tag_pattern` labels to the services you want to track.
2. Run `dockform images check` to see what's out there.
3. For floating-tag services, `dockform images pull --recreate` picks up new content under the same tag.
4. For pinned-version services, `dockform images upgrade` rewrites the tag in the compose file. Review, commit, then `dockform apply`.

## Tips

- Run `check` in CI to get a report of pending upgrades without touching anything.
- Patterns live with the service, not the stack. A postgres sidecar and the app it supports can use completely different tag schemes.
- Prefer pinned versions with a tag pattern over floating tags. `upgrade` gives you an auditable diff; `pull --recreate` gives you "whatever the registry says now".
