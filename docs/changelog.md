---
title: Changelog
icon: lucide/history
---

# Changelog

What changed in each Dockform release. For every commit, see the [releases on GitHub](https://github.com/gcstr/dockform/releases).

## v0.10

This release is about remote hosts and about seeing what `apply` is doing.

- **SSH tunnel transport**: Dockform now forwards each remote host's Docker socket over a single SSH connection. Large stacks no longer hit sshd's `MaxSessions` limit, and plans are faster. Choose a transport with `--ssh-transport` (`tunnel`, `mux` or `direct`); `--ssh-multiplex` is deprecated. See [Performance over SSH](more/performance_over_ssh.md).
- **`--parallel N`**: sets how many docker operations run at once against each remote host (default 2). It replaces `--sequential`, which still works but is deprecated.
- **Live apply view**: one line per resource that updates as work happens, with per-service progress, image pull percentages and health check waits. Finished groups fold into a summary, and failures keep their details.
- **Run logs**: every `apply` writes a full debug log to `.dockform/logs/`. See [Run logs](more/debugging.md#run-logs).
- **Plans grouped by context**: same-named resources on different hosts are easy to tell apart, and contexts or sections with nothing to do are left out.
- **`destroy: false`**: keep chosen volumes and networks when you run `dockform destroy`. See [Volumes](manifest/volumes.md#keeping-a-volume-on-destroy).
- **Cleaner pruning**: removing a stack now removes its leftover containers and Compose networks, matched by Compose project name.
- **Safer remote deployments**: bind mounts that point into your project are rejected on remote contexts, including interpolated and `include:`d ones. See [Bind mounts](manifest/stacks.md#bind-mounts).
- **Secrets stay off disk**: the rendered compose document, which holds decrypted secrets, is piped to compose instead of written to a temporary file.
- **Clearer errors and `doctor`**: `doctor` checks every context in the manifest, validation names the exact missing path, and failures show what compose actually said.

## v0.9

Dockform now helps keep images up to date: tells you what's out of date, pulls what you want to keep floating, and rewrites tags in your compose files so you can review the change like any other commit.

- **Image management commands**: `dockform images check`, `pull`, and `upgrade` report freshness, pull digest-drifted images, and rewrite outdated tags in your compose files
- **Per-service tag policy**: set `dockform.tag_pattern` as a compose label on each service to control which tags count as upgrades
- **UI/UX improvements**

See the [Image Management](more/images.md) guide for the full workflow.

## v0.8

- **Multi-context support**: Deploy to multiple Docker daemons from a single manifest
- **Automatic discovery**: Stacks and filesets are found from your directory structure
- **Simplified schema**: Less boilerplate, more convention-over-configuration
- **Context-scoped resources**: Volumes and networks are defined per context

Upgrading from an earlier version? See [Migrating to v0.8](introduction/migration_v08.md).
