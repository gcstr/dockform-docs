---
title: Dockform Volume Snapshot
---

# `dockform volume snapshot`

Create a snapshot of a Docker volume to local storage

### Synopsis

Create a snapshot of a Docker volume to local storage.

For multi-context setups, address the volume as <context>/<volume>
(e.g. hetzner-two/netbird_data). A bare volume name is allowed only when a
single context is configured.

```
dockform volume snapshot <[context/]volume> [flags]
```

### Options

```
  -h, --help            help for snapshot
      --note string     Optional note to include in metadata
  -o, --output string   Output directory for snapshots (defaults to ./.dockform/snapshots next to manifest)
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

* [dockform volume](/cli/dockform_volume)	 - Manage Docker volumes (snapshots, restore)

