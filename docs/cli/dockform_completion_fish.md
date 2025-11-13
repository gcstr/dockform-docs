---
title: Dockform Completion Fish
---

# `dockform completion fish`

Generate the autocompletion script for fish

### Synopsis

Generate the autocompletion script for the fish shell.

To load completions in your current shell session:

	dockform completion fish | source

To load completions for every new session, execute once:

	dockform completion fish > ~/.config/fish/completions/dockform.fish

You will need to start a new shell for this setup to take effect.


```
dockform completion fish [flags]
```

### Options

```
  -h, --help              help for fish
      --no-descriptions   disable completion descriptions
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

* [dockform completion](/cli/dockform_completion)	 - Generate the autocompletion script for the specified shell

