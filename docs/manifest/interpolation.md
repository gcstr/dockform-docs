---
title: Interpolation
---

# Interpolation

The manifest file accepts interpolation in the same format as Docker Compose files. Any text enclosed in `${}` is treated as a variable and replaced at runtime with the value from the current environment.

## Example

```bash
# export a variable
$ export AGE_KEY_FILE=~/.config/sops/age/keys.txt
```

::: code-group
```yaml [dockform.yaml]
docker:
  context: default
  identifier: my_project

sops:
  age:
    key_file: ${AGE_KEY_FILE} # [!code warning]
...
```
```yaml [dockform.yaml (rendered)]
docker:
  context: default
  identifier: my_project

sops:
  age:
    key_file: ~/.config/sops/age/keys.txt # [!code warning]
...
```
:::

This is especially useful when handling **secrets and sensitive values** outside
of Dockform, such as in GitHub Actions or other CI/CD systems. By interpolating
environment variables, you can keep credentials and tokens out of the manifest
file while still making them available at runtime.

E.g.:

::: code-group
```yaml [dockform.yaml]
...
stacks:
  website:
    root: website
    environment:
      inline:
        - API_KEY=${GITHUB_TOKEN}
...
```
:::

::: tip
For secrets managed directly by Dockform, see [Secrets Workflow](secrets/secrets)
:::