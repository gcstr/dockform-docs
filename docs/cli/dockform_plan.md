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
  -h, --help         help for plan
      --sequential   Use sequential processing instead of the default parallel processing (slower but uses less CPU and Docker daemon resources)
```

### Options inherited from parent commands

```
  -c, --config string       Path to configuration file or directory (defaults: dockform.yml, dockform.yaml, Dockform.yml, Dockform.yaml in current directory)
      --log-file string     Write JSON logs to file (in addition to stderr)
      --log-format string   Log format: auto, pretty, json (default "auto")
      --log-level string    Log level: debug, info, warn, error (default "info")
      --no-color            Disable color in pretty logs
  -v, --verbose             Verbose error output
```

### SEE ALSO

* [dockform](/cli/dockform)	 - Manage Docker Compose projects declaratively

