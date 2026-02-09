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

Warning: This operation is irreversible and will destroy ALL managed resources,
regardless of what's in your current configuration file.

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
      --log-file string     Write logs to file using the format specified by --log-format (in addition to stderr)
      --log-format string   Log format: auto, pretty, json (default "auto")
      --log-level string    Log level: debug, info, warn, error (default "info")
      --manifest string     Path to manifest file or directory (defaults: dockform.yml, dockform.yaml, Dockform.yml, Dockform.yaml in current directory)
      --no-color            Disable color in pretty logs
  -v, --verbose             Verbose error output
```

### SEE ALSO

* [dockform](/cli/dockform)	 - Manage Docker Compose projects declaratively

