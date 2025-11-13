---
title: Dockform Init
---

# `dockform init`

Create a template dockform.yml configuration file

### Synopsis

Create a template dockform.yml configuration file in the current directory or specified directory.

The generated file contains examples and comments explaining all available configuration options.

```
dockform init [directory] [flags]
```

### Options

```
  -h, --help   help for init
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

