---
title: Networks
---

# Networks

Dockform manages Docker networks declaratively through the root `networks` map.
This replaces imperative `docker network create` commands with a single source of truth in your manifest. Networks are created before Compose runs, and Dockform will reconcile drift in configuration by safely recreating networks when needed.

- **Declarative management**: define desired networks once; Dockform creates any that are missing.
- **Compose-friendly**: use Dockform-managed networks as `external` networks in `docker compose` files.
- **Idempotent**: safe to run repeatedly; only missing networks are created.

## Defining networks in the manifest

Declare top-level networks under `networks:`. Keys are the network names that will be created on the Docker host.

```yaml [dockform.yaml]
docker:
  context: default
  identifier: staging

networks:
  traefik: {}
  app_net:
    driver: bridge
    options:
      com.docker.network.bridge.enable_icc: "false"
    internal: false
    attachable: true
    ipv6: false
    subnet: 172.18.0.0/16
    gateway: 172.18.0.1
    ip_range: 172.18.0.0/24
    aux_addresses:
      host1: 172.18.0.2
```

- **Name rules**: keys must match `^[a-z0-9_.-]+$`.
- **Fields (optional)**:
  - `driver`: Docker network driver (e.g. `bridge`, `overlay`, `macvlan`).
  - `options`: arbitrary driver options (passed as `--opt key=value`).
  - `internal`: when true, restricts external connectivity (`--internal`).
  - `attachable`: allow standalone containers to attach (`--attachable`).
  - `ipv6`: enable IPv6 (`--ipv6`).
  - `subnet`, `gateway`, `ip_range`, `aux_addresses`: IPAM configuration for the first IPAM entry.

## Using networks from compose

Dockform does not inject networks into compose files. Instead, you reference networks that Dockform manages as `external` in your compose files and attach services to them.

```yaml [docker-compose.yaml]
services:
  web:
    image: nginx:alpine
    networks:
      - net

networks:
  net:
    external: true
    # optional: override the actual network name if you template it
    # name: "staging-net"
```

- With `networks.net.external: true`, Docker Compose will expect a pre-existing Docker network named `net` (or the provided `name:`), which Dockform ensures exists during `apply`.
- You may use environment expansion in compose for the `name:` field if needed (e.g., `name: "df_${DOCKFORM_RUN_ID}_net").

> Dockform labels created networks with `io.dockform.identifier=<identifier>` and only manages labeled networks for the active identifier.

## Lifecycle and operations

- **plan**: shows which networks will be created, drifted (will be recreated), or removed relative to your manifest and labeled resources in the Docker context.
- **apply**:
  - Lists existing labeled networks and creates any missing ones from `networks:`.
  - Detects drift by inspecting actual driver/options/IPAM vs manifest; if different, safely recreates the network (see below).
  - Labels networks with `io.dockform.identifier=<docker.identifier>`.
  - Proceeds to run `docker compose up` for stacks.
- **destroy**: discovers all labeled resources for the current identifier and removes them, including networks.

Notes:
- Dockform checks for existing networks by name; it will not duplicate or rename networks.
- Dockform only manages networks that carry the Dockform label for the active identifier.

## End-to-end example

::: code-group

```yaml [dockform.yaml]
docker:
  context: default
  identifier: staging

stacks:
  app:
    root: ./app
    project:
      name: app-staging

networks:
  app-net:
    driver: bridge
    options:
      com.docker.network.bridge.enable_icc: "false"
```

```yaml [app/docker-compose.yaml]
services:
  web:
    image: nginx:alpine
    networks:
      - app-net

networks:
  app-net:
    external: true
```

:::

- Run `dockform plan` to see the pending network creations.
- Run `dockform apply` to create networks and start services.
