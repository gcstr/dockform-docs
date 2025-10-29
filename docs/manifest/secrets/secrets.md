---
title: Secrets
---

# Secrets

Dockform leverages the battle-tested [SOPS](https://github.com/getsops/sops) tool to manage secrets in a git-friendly way, supporting both the **Age** and **PGP (GnuPG)** backends.

This allows you to keep sensitive values (API keys, credentials, tokens, etc.) version-controlled in encrypted form, while editing and using them seamlessly during your workflow.

## Requirements

You need **SOPS** installed. Depending on the backend you choose, install:

- Age (for Age backend)
- GnuPG (for PGP backend)

Links:
- [SOPS installation guide](https://github.com/getsops/sops#installation)  
- [Age installation guide](https://github.com/FiloSottile/age#installation)
- [GnuPG (gpg) installation](https://gnupg.org/download/)

## Configuration

Configure SOPS backends under the root `sops` block in your `dockform.yaml`.

::: code-group

```yaml [Age]
sops:
  age:
    key_file: ${AGE_KEY_FILE}
    recipients: [] # optional; if empty, Dockform derives from key_file
```

```yaml [PGP]
sops:
  pgp:
    keyring_dir: "${GNUPGHOME}"
    use_agent: true                # use gpg-agent/pinentry
    pinentry_mode: "default"       # or "loopback" (non-interactive)
    recipients: ["FPR_OR_UID", "..."]
    passphrase: "${GPG_PASSPHRASE}" # optional; used with loopback when needed
```

```yaml [Both]
sops:
  age:
    key_file: ${AGE_KEY_FILE}
    recipients: ["age1...", "age1..."]
  pgp:
    keyring_dir: "${GNUPGHOME}"
    recipients: ["0xFINGERPRINT", "dev@example.com"]
    use_agent: true
    pinentry_mode: default
```
:::

<div class="custom-block tip" style="padding-top: 8px">

If both Age and PGP recipients are provided, Dockform passes both to SOPS so files are encrypted for all specified recipients.  

The top level `sops.recipients` at is **deprecated**.  
Move values to `sops.age.recipients` or `sops.pgp.recipients`.  

`sops.age.key_file` is optional when you explicitly provide `sops.age.recipients`.  

`sops.pgp.pinentry_mode` accepts `default` or `loopback`. When `loopback` and `use_agent` is false, Dockform sets `SOPS_GPG_EXEC="gpg --pinentry-mode loopback"` to support non-interactive flows.  

`sops.pgp.keyring_dir` sets `GNUPGHOME` so SOPS/GnuPG read keys from that directory (supports `~/` expansion).

</div>

## Workflow (Age)

### 1. Create an Age key file

Generate a new Age key pair and store it locally:

```sh [shell ~vscode-icons:file-type-shell~]
$ age-keygen -o ~/.config/sops/age/keys.txt
```

### 2. Reference the key file in the manifest

Point Dockform to your Age key file inside `dockform.yaml` (directly or via environment variable interpolation):

```yaml [dockform.yaml]
sops:
  age:
    key_file: ${AGE_KEY_FILE}
```

### 3. Create a new encrypted dotenv file

Use Dockform to scaffold a new secrets file:

```sh [shell ~vscode-icons:file-type-shell~]
$ dockform secrets create secrets.env
# A template encrypted dotenv file will be created
```

### 4. Edit the secrets file

Open the file securely with your `$EDITOR`. Dockform decrypts it on the fly and re-encrypts on save:

```sh [shell ~vscode-icons:file-type-shell~]
$ dockform secrets edit secrets.env
```

## Workflow (PGP)

You can use PGP keys managed by GnuPG.

### 1. Prepare GnuPG keyring

- Ensure your private and public keys are available under your GnuPG home (e.g., `~/.gnupg`), or configure an isolated directory via `sops.pgp.keyring_dir`.
- Identify recipient values (fingerprints like `0x...`, long key IDs, or user IDs/emails).

### 2. Configure the manifest

```yaml [dockform.yaml]
sops:
  pgp:
    keyring_dir: "~/.gnupg"          # or a dedicated directory
    recipients:
      - 0xDEADBEEFCAFEBABE            # example fingerprint
      - ops@example.com               # or UID/email
    use_agent: true                   # recommended when pinentry is available
    pinentry_mode: default            # use "loopback" for headless input
```

Optional for headless CI with loopback:

```yaml [dockform.yaml]
sops:
  pgp:
    keyring_dir: "~/.gnupg"
    recipients: ["0xDEADBEEFCAFEBABE"]
    use_agent: false
    pinentry_mode: loopback
    passphrase: ${GPG_PASSPHRASE}
```

### 3. Create or rekey secrets

- Create: `dockform secrets create secrets.env`
- Rekey existing files to include PGP recipients: `dockform secrets rekey`

Dockform passes PGP recipients to SOPS via `--pgp`. If both Age and PGP recipients are set, Dockform includes both `--age` and `--pgp`.

## Decrypting and editing

- `dockform secrets decrypt <path>` prints plaintext to stdout (dotenv format). It respects `sops.age.key_file` and `sops.pgp.*` configuration.
- `dockform secrets edit <path>` opens a temporary plaintext view in your editor, then re-encrypts on save.

## Using secrets in your manifest

Reference the encrypted dotenv file inside your manifest.  
Secrets can be defined globally or scoped to a specific stack.

```yaml [dockform.yaml]
secrets:
  sops:
    - app/secrets.env
```

For stack-specific secrets:

```yaml [dockform.yaml]
stacks:
  web:
    secrets:
      sops:
        - web/secrets.env
```

## Doctor checks

Run `dockform doctor` to validate your environment.
- SOPS: verifies the `sops` binary is available.
- GPG: warns if `gpg` is not installed; when present, prints version, attempts to show the agent socket via `gpgconf --list-dirs agent-socket`, and detects loopback support by checking for `--pinentry-mode`.

## Using secrets without SOPS (CI-managed)

If you prefer not to use SOPS, you can manage sensitive values via your CI/CD system’s secret store (e.g., GitHub Actions). Provide secrets as environment variables at runtime and reference them from Compose or the manifest.

- Set CI environment variables from your secret store.
- Add them to Dockform `environment.inline` to ensure Compose receives them during planning and apply.

::: code-group

```yaml [dockform.yaml]
docker:
  context: default
  identifier: production

environment:
  inline:
    # These values are interpolated from CI-provided env vars at load time
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    - OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}

stacks:
  app:
    root: ./app
    files: [docker-compose.yaml]
```

```yaml [app/docker-compose.yaml]
services:
  api:
    image: ghcr.io/example/api:latest
    environment:
      # Compose reads values from the process environment (provided by CI or Dockform inline env)
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
```

```yaml [ .github/workflows/deploy.yml ]
name: Deploy
on:
  workflow_dispatch:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      # Provide secrets from GitHub Actions to the process environment
      POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
      OIDC_CLIENT_SECRET: ${{ secrets.OIDC_CLIENT_SECRET }}
      # Optional: set a stable run identifier for scoping
      DOCKFORM_RUN_ID: production
    steps:
      - uses: actions/checkout@v4

      - name: Install Dockform
        run: |
          curl -L https://github.com/gcstr/dockform/releases/latest/download/dockform_linux_amd64 -o dockform
          chmod +x dockform
          sudo mv dockform /usr/local/bin/dockform

      - name: Plan
        run: dockform plan -c .

      - name: Apply
        run: dockform apply -c .
```

:::

Notes:
- Environment variable interpolation (`${VAR}`) in `dockform.yaml` occurs at load time using the runner’s environment.
- You can mix CI-managed env vars with SOPS-managed secrets if needed.
