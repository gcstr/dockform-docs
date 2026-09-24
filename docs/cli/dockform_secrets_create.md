---
title: Dockform Secrets Create
---

# `dockform secrets create`

Create a new SOPS-encrypted dotenv file

```
dockform secrets create <path> [flags]
```

### Options

```
  -h, --help   help for create
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

* [dockform secrets](/cli/dockform_secrets)	 - Manage SOPS secrets

