---
title: Dockform Completion Bash
---

# `dockform completion bash`

Generate the autocompletion script for bash

### Synopsis

Generate the autocompletion script for the bash shell.

This script depends on the 'bash-completion' package.
If it is not installed already, you can install it via your OS's package manager.

To load completions in your current shell session:

	source <(dockform completion bash)

To load completions for every new session, execute once:

#### Linux:

	dockform completion bash > /etc/bash_completion.d/dockform

#### macOS:

	dockform completion bash > $(brew --prefix)/etc/bash_completion.d/dockform

You will need to start a new shell for this setup to take effect.


```
dockform completion bash
```

### Options

```
  -h, --help              help for bash
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

