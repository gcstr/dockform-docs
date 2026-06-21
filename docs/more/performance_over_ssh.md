---
title: Performance over SSH
icon: lucide/gauge
---

# Performance over SSH

When you manage remote Docker hosts through SSH contexts (`host: ssh://user@host`),
`dockform plan` and `apply` shell out to `docker` many times to read service
state, parse compose configs, list volumes, networks, and sync filesets. Each
of those calls opens its **own** SSH connection, and the TCP/SSH handshake on
every call can quickly flood.

A single `plan` against a few hosts can easily make ~200 `docker` invocations.

## Reuse one connection: SSH multiplexing

The workaround is SSH connection **multiplexing** (`ControlMaster` / `ControlPersist`):
the first connection to a host becomes a persistent master, and every later
call reuses it instead of a new handshaking.

Add this to your `~/.ssh/config`:

```ssh-config
Host server-one server-two server-three
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 2m
    ServerAliveInterval 30
```

Then create the socket directory once:

```bash
mkdir -p ~/.ssh/sockets
```

!!! tip "Keep `ControlPath` short"
    The control socket is a Unix domain socket, which has a ~104-character path
    limit on most systems. A long home-directory path plus `%r@%h-%p` can exceed
    it. If you hit "unix_listener: path too long", point `ControlPath` somewhere
    short like `~/.ssh/sockets/%C`.

