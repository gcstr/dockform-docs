---
title: Dockform Destroy
---

# `dockform destroy`

Destroy all managed resources

### Synopsis

Destroy all resources managed by dockform with the configured identifier.

This command will:
- List all containers, networks, volumes, and filesets labeled with the dockform identifier
- Show a plan of what will be destroyed (same format as 'dockform plan')
- Prompt for confirmation by typing the identifier name
- Destroy resources in the correct order (containers → networks → volumes)

Warning: This operation is irreversible. It destroys every managed resource,
whether or not your configuration still declares it, except context volumes
and networks declared with 'destroy: false', which are kept and listed as kept.

Use --stack or --context to scope the destroy. When scoped, only the targeted
stacks' services and their own fileset volumes are removed; shared context-level
networks and volumes are preserved.

```
dockform destroy [flags]
```

### Options

```
      --context strings     Target specific context(s)
      --deployment string   Target a named deployment group
  -h, --help                help for destroy
      --skip-confirmation   Skip confirmation prompt and destroy immediately
      --stack strings       Target specific stack(s) in context/stack format
      --strict              Fail destroy when cleanup operations encounter errors
      --verbose-errors      Print detailed cleanup error details when not using --strict
```

### Options inherited from parent commands

```
      --log-file string        Write logs to file using the format specified by --log-format (in addition to stderr)
      --log-format string      Log format: auto, pretty, json (default "auto")
      --log-level string       Log level: debug, info, warn, error (default "info")
      --manifest string        Path to manifest file or directory (defaults: dockform.yml, dockform.yaml, Dockform.yml, Dockform.yaml in current directory)
      --no-color               Disable color in pretty logs
      --ssh-transport string   How to reach ssh:// Docker contexts: tunnel forwards the Docker socket over one SSH connection per host (default); mux multiplexes an SSH session per docker call over one connection; direct opens a new connection per docker call and is not recommended. Also settable with DOCKFORM_SSH_TRANSPORT (default "tunnel")
  -v, --verbose                Verbose error output
```

### SEE ALSO

* [dockform](/cli/dockform)	 - Manage Docker Compose projects declaratively

