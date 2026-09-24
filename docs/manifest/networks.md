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

```yaml title="dockform.yml"
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
| `destroy` | Set to `false` to keep the network when `dockform destroy` runs (see [Keeping a network on destroy](#keeping-a-network-on-destroy)) |

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
| **destroy** | Removes all labeled networks for the current identifier, except the ones marked `destroy: false`. |

!!! Note
    - Dockform labels created networks with `io.dockform.identifier=<identifier>`
    - Only labeled networks are managed for the active identifier

### Networks created by Compose

Networks that Compose creates for a stack (the ones defined in a compose file rather than in the manifest) belong to that stack. Dockform leaves them alone while the stack is in the manifest. Once you remove the stack, the next `plan` lists its leftover networks as `will be deleted` and `apply` removes them.

Dockform matches these networks to stacks by the Compose project name, the same one `docker compose` uses: `COMPOSE_PROJECT_NAME`, then the top-level `name:` in the compose file, then the directory name. If it can't work out a stack's project name, it keeps every Compose network and logs a warning rather than risk deleting one that's still in use. Targeted runs (`--context`, `--stack` or `--deployment`) never prune networks.

### Keeping a network on destroy

Mark a network `destroy: false` to have `dockform destroy` leave it in place:

```yaml title="dockform.yml"
contexts:
  default:
    networks:
      traefik:
        destroy: false
```

`dockform destroy` lists it as `kept (destroy: false)` and removes everything else. Like the volume option, it protects the network only while its entry is in the manifest: delete the entry and the next `apply` removes the network. See [Keeping a volume on destroy](volumes.md#keeping-a-volume-on-destroy) for details.

## Example

=== "dockform.yml"

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
