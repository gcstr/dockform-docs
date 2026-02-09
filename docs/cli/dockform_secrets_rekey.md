---
title: Dockform Secrets Rekey
---

# `dockform secrets rekey`

Re-encrypt all declared SOPS secret files with configured recipients

```
dockform secrets rekey [flags]
```

### Options

```
  -h, --help   help for rekey
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

* [dockform secrets](/cli/dockform_secrets)	 - Manage SOPS secrets

