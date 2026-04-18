---
title: Dockform Images Upgrade
---

# `dockform images upgrade`

Upgrade image tags in compose files to the newest available versions

### Synopsis

Upgrade image tags in compose files to the newest available versions.

With no positional arguments, every service in scope is considered. Pass
service names to narrow the upgrade; combine with --stack to scope those names
to a single stack. A typo or unmatched name fails with an error listing the
services available in scope.

```
dockform images upgrade [service...] [flags]
```

### Options

```
      --context strings     Target specific context(s)
      --deployment string   Target a named deployment group
      --dry-run             Preview changes without writing files
  -h, --help                help for upgrade
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

* [dockform images](/cli/dockform_images)	 - Manage and check container images

