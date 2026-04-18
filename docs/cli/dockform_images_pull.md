---
title: Dockform Images Pull
---

# `dockform images pull`

Pull images whose remote digest has changed (same tag, new content)

### Synopsis

Pull images where the remote digest differs from the local copy.

This updates images on the remote Docker daemon without modifying compose files.
Use --recreate to also restart affected containers so they run the new image.

With no positional arguments, every service in scope is considered. Pass
service names to narrow the pull; combine with --stack to scope those names to
a single stack. A typo or unmatched name fails with an error listing the
services available in scope.

```
dockform images pull [service...] [flags]
```

### Options

```
      --context strings     Target specific context(s)
      --deployment string   Target a named deployment group
      --dry-run             Show what would be pulled without making any changes
  -h, --help                help for pull
      --recreate            Recreate containers after pulling to apply the new image
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

