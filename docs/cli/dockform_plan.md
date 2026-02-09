---
title: Dockform Plan
---

# `dockform plan`

Show the plan to reach the desired state

```
dockform plan [flags]
```

### Options

```
      --context strings     Target specific context(s)
      --deployment string   Target a named deployment group
  -h, --help                help for plan
      --sequential          Use sequential processing instead of the default parallel processing (slower but uses less CPU and Docker daemon resources)
      --stack strings       Target specific stack(s) in context/stack format
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

