---
title: Dockform Secrets
---

# `dockform secrets`

Manage SOPS secrets

```
dockform secrets [flags]
```

### Options

```
  -h, --help   help for secrets
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
* [dockform secrets create](/cli/dockform_secrets_create)	 - Create a new SOPS-encrypted dotenv file
* [dockform secrets decrypt](/cli/dockform_secrets_decrypt)	 - Decrypt a SOPS-encrypted dotenv file and print to stdout
* [dockform secrets edit](/cli/dockform_secrets_edit)	 - Edit a SOPS-encrypted dotenv file interactively
* [dockform secrets rekey](/cli/dockform_secrets_rekey)	 - Re-encrypt all declared SOPS secret files with configured recipients

