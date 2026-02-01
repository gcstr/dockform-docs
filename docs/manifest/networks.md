---
title: Networks
icon: lucide/network
---

# Networks

Dockform manages Docker networks declaratively through context-scoped `networks` maps.
This replaces imperative `docker network create` commands with a single source of truth in your manifest.

- **Declarative management**: Define desired networks once; Dockform creates any that are missing.
- **Context-scoped**: Networks are defined per Docker context for multi-host deployments.
- **Drift detection**: Dockform detects configuration drift and safely recreates networks when needed.
- **Compose-friendly**: Use Dockform-managed networks as `external` networks in your compose files.
- **Idempotent**: Safe to run repeatedly; only missing networks are created.

## Defining Networks

Declare networks under each context in your manifest:

```yaml title="dockform.yaml"
identifier: staging

contexts:
  default:
    networks:
      traefik: {}
      app-net:
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

### Network Options

| Field | Description |
|-------|-------------|
| `driver` | Docker network driver (e.g., `bridge`, `overlay`, `macvlan`) |
| `options` | Driver options (passed as `--opt key=value`) |
| `internal` | Restrict external connectivity (`--internal`) |
| `attachable` | Allow standalone containers to attach (`--attachable`) |
| `ipv6` | Enable IPv6 (`--ipv6`) |
| `subnet` | IPAM subnet configuration |
| `gateway` | IPAM gateway configuration |
| `ip_range` | IPAM IP range configuration |
| `aux_addresses` | IPAM auxiliary addresses |

!!! info "Naming rules"
    Network names must match `^[a-z0-9_.-]+$`

## Using Networks from Compose

Reference Dockform-managed networks as `external` in your compose files:

```yaml title="default/web/compose.yaml"
services:
  nginx:
    image: nginx:alpine
    networks:
      - traefik
      - app-net

networks:
  traefik:
    external: true
  app-net:
    external: true
```

- With `external: true`, Docker Compose expects a pre-existing network
- Dockform ensures the network exists during `apply`
- You can use environment expansion for dynamic names: `name: "${DOCKFORM_RUN_ID}_net"`

## Multi-Context Networks

Different contexts can have different network configurations:

```yaml
identifier: myapp

contexts:
  default:
    networks:
      dev-net:
        driver: bridge
  
  staging:
    networks:
      staging-net:
        driver: bridge
        internal: true
  
  production:
    networks:
      prod-net:
        driver: overlay
        attachable: true
      traefik:
        driver: bridge
```

## Drift Detection and Recreation

Dockform inspects existing networks and compares them against your manifest:

- **Driver changes**: Network recreated
- **Options changes**: Network recreated
- **IPAM changes**: Network recreated

When drift is detected, Dockform safely recreates the network:

1. Disconnects all containers
2. Removes the network
3. Creates the network with the new configuration
4. Reconnects containers during compose up

!!! warning
    Network recreation temporarily disconnects containers. Plan for brief connectivity interruptions.

## Lifecycle and Operations

| Step | Operation |
| -- | -- |
| **plan** | Shows which networks will be created, drifted (will be recreated), or removed. |
| **apply** | Creates missing networks, detects and handles drift, labels with `io.dockform.identifier=<identifier>`. |
| **destroy** | Removes all labeled networks for the current identifier. |

!!! Note
    - Dockform labels created networks with `io.dockform.identifier=<identifier>`
    - Only labeled networks are managed for the active identifier

## Example

=== "dockform.yaml"

    ```yaml
    identifier: staging

    contexts:
      default:
        networks:
          app-net:
            driver: bridge
            options:
              com.docker.network.bridge.enable_icc: "false"
    ```

=== "default/web/compose.yaml"

    ```yaml
    services:
      web:
        image: nginx:alpine
        networks:
          - app-net

    networks:
      app-net:
        external: true
    ```

Run `dockform plan` to preview network creation, then `dockform apply` to create networks and start services.
