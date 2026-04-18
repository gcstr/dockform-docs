---
title: Dockform Images Check
---

# `dockform images check`

Check image freshness across compose stacks

### Synopsis

Check image freshness across compose stacks.

With no positional arguments, every service in scope is checked. Pass service
names to narrow the check; combine with --stack to scope those names to a
single stack. A typo or unmatched name fails with an error listing the services
available in scope.

```
dockform images check [service...] [flags]
```

### Options

```
      --all                 Show all images, including those that are up to date
      --context strings     Target specific context(s)
      --deployment string   Target a named deployment group
  -h, --help                help for check
      --json                Output results as JSON
      --sequential          Disable parallel checks (reserved for future use)
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

