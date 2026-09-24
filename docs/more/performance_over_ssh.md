---
title: Performance over SSH
icon: lucide/gauge
---

# Performance over SSH

When you manage remote Docker hosts through SSH contexts (`host: ssh://user@host`),
`dockform plan` and `apply` make a lot of `docker` calls: reading service state,
hashing compose configs, listing volumes and networks, and syncing filesets. How
those calls reach the remote daemon makes a big difference, both to speed and to
whether large stacks work at all.

Dockform handles this for you. You don't need any `ControlMaster` settings in
`~/.ssh/config`.

## SSH transports

Dockform can reach an `ssh://` context in three ways. Pick one with
`--ssh-transport` or the `DOCKFORM_SSH_TRANSPORT` environment variable; the flag
wins over the variable.

| Transport | How it works | When to use it |
|-----------|--------------|----------------|
| `tunnel` (default) | One `ssh -L` connection per host forwards the remote Docker socket for the length of the command | Almost always |
| `mux` | One SSH connection per host, with each `docker` call opening a session on it | If the tunnel can't be used on a host |
| `direct` | A new SSH connection for every `docker` call | Not recommended |

```bash
dockform plan                          # tunnel
dockform apply --ssh-transport=mux
DOCKFORM_SSH_TRANSPORT=mux dockform plan
```

### `tunnel` (default)

For each `ssh://` context, Dockform opens one SSH connection that forwards the
host's Docker socket to a local socket, and points `docker` at it. Every API
connection, including the one Compose opens per service, travels as a
forwarding channel inside that single connection.

- **Large stacks work.** sshd's `MaxSessions` limit doesn't apply to forwarding
  channels, so a stack with 30 services applies fine against a stock sshd.
- **It's fast.** A full plan against three hosts took about 14s on the tunnel
  versus about 24s on `mux`.
- **It cleans up after itself.** The tunnel lives in a private directory and
  closes when the command ends, including on Ctrl-C. The remote side exits when
  Dockform does, even if Dockform is killed.
- **Your SSH config still applies.** Dockform hands the host to `ssh` as written,
  so users, ports, keys and jump hosts from `~/.ssh/config` all work. The tunnel
  ignores any `ControlMaster` you've set up.

Requirements on the remote host:

- sshd must allow socket forwarding. `AllowStreamLocalForwarding` defaults to
  `yes`, so this only matters if someone turned it off.
- Docker must listen on a Unix socket. Dockform uses `/var/run/docker.sock`, and
  if that isn't there (rootless Docker, for example) it asks the host's own
  `docker` CLI where the daemon listens.

When a tunnel can't open, the error says why: authentication failed, the host
name didn't resolve, the port was closed or the host was unreachable. It lists
every context that failed and suggests `--ssh-transport=mux` as a fallback. If a
tunnel drops in the middle of an `apply`, the error warns that the host may be
partly applied; running `apply` again brings it back in line.

### `mux`

Dockform reuses one SSH connection per host for the whole run by placing a small
`ssh` wrapper on the `PATH` it gives `docker`. The wrapper adds `ControlMaster`
settings, and Docker's own SSH helper picks them up. Everything is removed when
the run ends.

The limit is sshd's `MaxSessions` (OpenSSH default: 10). Each `docker` call opens
a session on the shared connection, and `docker compose up` opens one per
service, so a stack with more services than that limit fails. See
[Large stacks and MaxSessions](#large-stacks-and-maxsessions).

`dockform dashboard` always uses `mux`, whatever `--ssh-transport` says. It runs
for as long as you keep it open, and `mux` recovers on its own after a laptop
sleeps or the network changes, where a tunnel would not.

### `direct`

Every `docker` call opens its own SSH connection. Many handshakes at once can
trip sshd's `MaxStartups` limit, which refuses connections at random: in testing,
a 9-service stack failed half the time and left stacks partly applied. Use it
only to rule the other transports out while debugging.

### Which commands use it

`plan`, `apply`, `destroy`, `validate`, `volume snapshot` and `restore`, and
`images check`, `pull` and `upgrade` all follow `--ssh-transport`. `dashboard`
always uses `mux`. With the `tunnel` transport, `doctor` checks each context
through its tunnel, and a context whose tunnel cannot open fails on its own line
with the SSH reason, so you see what `apply` would run into.

### Replacing `--ssh-multiplex`

`--ssh-transport` replaces the `--ssh-multiplex` flag and the
`DOCKFORM_SSH_MULTIPLEX` variable. Both still work but are deprecated:
`false` means `direct` and `true` means `mux`. Setting the old and the new option
to conflicting values is an error (exit code `2`).

## Limiting load with `--parallel`

`plan` and `apply` run several `docker` operations at once. `--parallel N` sets
how many run at the same time against each remote host:

```bash
dockform apply --parallel 1    # one at a time, gentlest on the server
dockform apply                 # default: 2 per host
dockform plan --parallel 4     # faster on a host that can take it
```

- The default is 2 per host.
- It applies to `ssh://` contexts; local contexts aren't capped.
- Lower it for small servers that struggle under load; raise it for a faster plan
  on hosts with room to spare. A full plan against three hosts took 26.6s at `1`,
  about 17.5s at `2` and 13.6s at `4`.

`--parallel` limits Dockform's own concurrency. It does **not** limit how many
containers `docker compose up` starts at once inside a single stack, so it won't
help with one very large stack. Splitting that stack will.

`--sequential` still works but is deprecated. It's the same as `--parallel 1`;
combining it with a different `--parallel` value, or passing `--parallel 0`, is
an error (exit code `2`).

## Large stacks and MaxSessions

With `mux`, a stack with more services than the host's `MaxSessions` fails, even
though the daemon is healthy. Dockform recognizes the error and explains it:

```
Error: list compose containers for stack server-two/big-stack (30 services started concurrently)
...
Hint: The SSH server refused a new session: the host's MaxSessions limit is exhausted (OpenSSH default: 10).
      Each service in a stack opens its own SSH session, so a stack larger than that limit cannot start.
      Fix by either raising MaxSessions in sshd_config on that host, or splitting the stack into smaller ones.
      Note: --parallel does not affect this. The concurrency is inside docker compose, not dockform.
```

Your options, from simplest:

1. Use the default `tunnel` transport, which isn't affected by `MaxSessions`.
2. Raise `MaxSessions` in the host's `sshd_config`.
3. Split the stack into smaller ones.

Lowering `--parallel` won't help, because the connections come from inside a
single `docker compose up`.

## Fewer round trips

Independently of the transport, Dockform batches the calls it can. It hashes
every service in a stack with one `docker compose config --hash '*'` call, and
reads the fileset indexes for all volumes on a host with one helper container
instead of one per volume.

## Measuring

To see where a slow run spends its time, write a debug log and look at the
`docker` calls:

```bash
dockform plan --log-level debug --log-file plan.log
```

Every `apply` also writes a full debug log on its own; see
[Run logs](debugging.md#run-logs).
