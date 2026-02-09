---
title: Dockform Completion Zsh
---

# `dockform completion zsh`

Generate the autocompletion script for zsh

### Synopsis

Generate the autocompletion script for the zsh shell.

If shell completion is not already enabled in your environment you will need
to enable it.  You can execute the following once:

	echo "autoload -U compinit; compinit" >> ~/.zshrc

To load completions in your current shell session:

	source <(dockform completion zsh)

To load completions for every new session, execute once:

#### Linux:

	dockform completion zsh > "${fpath[1]}/_dockform"

#### macOS:

	dockform completion zsh > $(brew --prefix)/share/zsh/site-functions/_dockform

You will need to start a new shell for this setup to take effect.


```
dockform completion zsh [flags]
```

### Options

```
  -h, --help              help for zsh
      --no-descriptions   disable completion descriptions
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

* [dockform completion](/cli/dockform_completion)	 - Generate the autocompletion script for the specified shell

