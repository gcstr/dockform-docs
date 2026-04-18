---
title: Dockform Images
---

# `dockform images`

Manage and check container images

### Options

```
  -h, --help   help for images
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
* [dockform images check](/cli/dockform_images_check)	 - Check image freshness across compose stacks
* [dockform images pull](/cli/dockform_images_pull)	 - Pull images whose remote digest has changed (same tag, new content)
* [dockform images upgrade](/cli/dockform_images_upgrade)	 - Upgrade image tags in compose files to the newest available versions

