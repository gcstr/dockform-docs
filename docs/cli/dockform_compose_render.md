---
title: Dockform Compose Render
---

# `dockform compose render`

Render a stack's docker compose config fully resolved

```
dockform compose render [stack] [flags]
```

### Options

```
  -h, --help           help for render
      --mask string    Secret masking strategy: full|partial|preserve-length (default "full")
      --show-secrets   Show secrets inline (dangerous)
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

* [dockform compose](/cli/dockform_compose)	 - Work with docker compose files for stacks

