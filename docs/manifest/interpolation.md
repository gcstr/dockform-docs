---
title: Interpolation
icon: lucide/between-vertical-start
---

# Interpolation

The manifest supports `${VAR}` interpolation: each `${VAR}` is replaced with the value of `VAR` from the environment when Dockform loads the manifest.

Only the plain `${VAR}` form is supported. Compose's extras such as `${VAR:-default}` or `${VAR:?error}` don't work in the manifest (they still work inside your compose files, which Compose interpolates itself). If a variable isn't set, it becomes an empty string and Dockform prints a warning naming it. Run `dockform manifest render` to see the manifest after interpolation.

## Example

```bash
# export a variable
$ export AGE_KEY_FILE=~/.config/sops/age/keys.txt
```

=== "dockform.yml"

    ```yaml hl_lines="8"
    identifier: my_project

    contexts:
      default: {}

    sops:
      age:
        key_file: ${AGE_KEY_FILE}
    ```

=== "dockform.yml (rendered)"

    ```yaml hl_lines="8"
    identifier: my_project

    contexts:
      default: {}

    sops:
      age:
        key_file: ~/.config/sops/age/keys.txt
    ```

This is especially useful when handling **secrets and sensitive values** outside
of Dockform, such as in GitHub Actions or other CI/CD systems. By interpolating
environment variables, you can keep credentials and tokens out of the manifest
file while still making them available at runtime.

E.g.:

=== "dockform.yml"

    ```yaml
    stacks:
      default/website:
        environment:
          inline:
            - API_KEY=${GITHUB_TOKEN}
    ```

!!! tip
    For secrets managed directly by Dockform, see [Secrets Workflow](secrets)