---
title: Dockform Apply
---

# `dockform apply`

Apply the desired state

```
dockform apply [flags]
```

### Options

```
      --context strings        Target specific context(s)
      --deployment string      Target a named deployment group
  -h, --help                   help for apply
      --long                   Show the full plan including unchanged resources
      --parallel int           How many docker operations to run at once against each remote host. Lower it for small servers; 1 runs everything one at a time. It does not limit how many containers compose starts at once within a single stack (default 2)
      --skip-confirmation      Skip confirmation prompt and apply immediately
      --stack strings          Target specific stack(s) in context/stack format
      --strict-prune           Fail apply when prune operations encounter errors
      --verbose-prune-errors   Print detailed prune error details when not using --strict-prune
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

