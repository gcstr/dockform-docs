---
title: Secrets
icon: lucide/lock-keyhole
---

# Secrets

Dockform leverages the battle-tested [SOPS](https://github.com/getsops/sops) tool to manage secrets in a git-friendly way, supporting both the **Age** and **PGP (GnuPG)** backends.

This allows you to keep sensitive values (API keys, credentials, tokens, etc.) version-controlled in encrypted form, while editing and using them seamlessly during your workflow.

## How It Works

Dockform decrypts secrets at runtime and passes them as **environment
variables** to the Docker Compose process. However, you must **explicitly
declare** which environment variables each service should receive in your
`docker-compose.yml` file.

**Key Point:** Secrets are decrypted and made available to Docker Compose,
but services only receive them if you add them to the `environment:` section in your compose file.
This follows the **principle of least privilege** - not all services should have access to all secrets.

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

=== "Age"

    ```yaml title="dockform.yaml"
    sops:
      age:
        key_file: ${AGE_KEY_FILE}
        recipients: [] # optional; if empty, Dockform derives from key_file
    ```

=== "PGP"

    ```yaml
    sops:
      pgp:
        keyring_dir: "${GNUPGHOME}"
        use_agent: true                # use gpg-agent/pinentry
        pinentry_mode: "default"       # or "loopback" (non-interactive)
        recipients: ["FPR_OR_UID", "..."]
        passphrase: "${GPG_PASSPHRASE}" # optional; used with loopback when needed
    ```

=== "Both"

    ```yaml
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

!!! note
    - If both Age and PGP recipients are provided, Dockform passes both to SOPS so files are encrypted for all specified recipients.  
    - `sops.age.key_file` is optional when you explicitly provide `sops.age.recipients`.  
    - `sops.pgp.pinentry_mode` accepts `default` or `loopback`. When `loopback` and `use_agent` is false, Dockform sets `SOPS_GPG_EXEC="gpg --pinentry-mode loopback"` to support non-interactive flows.  
    - `sops.pgp.keyring_dir` sets `GNUPGHOME` so SOPS/GnuPG read keys from that directory (supports `~/` expansion).

## Workflow (age backend)

### 1. Create an age key file

Generate a new Age key pair and store it locally:

```sh
age-keygen -o ~/.config/sops/age/keys.txt
```

### 2. Reference the key file in the manifest

Point Dockform to your Age key file inside `dockform.yaml` (directly or via environment variable interpolation):

```yaml title="dockform.yaml"
sops:
  age:
    key_file: ${AGE_KEY_FILE}
```

### 3. Create a new encrypted dotenv file

Use Dockform to scaffold a new secrets file:

```sh
dockform secrets create secrets.env
# A template encrypted dotenv file will be created
```

### 4. Edit the secrets file

Open the file securely with your `$EDITOR`. Dockform decrypts it on the fly and re-encrypts on save:

```sh
dockform secrets edit secrets.env
```

## Workflow (PGP backend)

You can use PGP keys managed by GnuPG.

### 1. Prepare GnuPG keyring

- Ensure your private and public keys are available under your GnuPG home (e.g., `~/.gnupg`), or configure an isolated directory via `sops.pgp.keyring_dir`.
- Identify recipient values (fingerprints like `0x...`, long key IDs, or user IDs/emails).

### 2. Configure the manifest

```yaml title="dockform.yaml"
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

```yaml title="dockform.yaml"
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

## Complete Example

Here's a complete end-to-end example showing how secrets flow from encrypted files into your containers.

### 1. Create and encrypt your secrets file

**secrets.env** (encrypted with SOPS):
```bash
DB_PASSWORD=supersecret123
API_KEY=sk-1234567890abcdef
```

### 2. Reference secrets in dockform.yaml

```yaml title="dockform.yaml"
docker:
  identifier: myapp

sops:
  age:
    key_file: ~/.config/sops/age/keys.txt

# Global secrets available to all stacks
secrets:
  sops:
    - ./secrets.env

stacks:
  web:
    root: ./web
    files: [docker-compose.yml]
```

### 3. Declare environment variables in docker-compose.yml

!!! warning "Important!"
    You **must** explicitly declare environment variables in your compose file. Without this, secrets won't be injected into containers.

```yaml title="web/docker-compose.yml"
services:
  api:
    image: myapp/api:latest
    environment:
      # Explicitly declare which secrets this service needs
      - DB_PASSWORD      # Gets value from decrypted secrets.env
      - API_KEY          # Gets value from decrypted secrets.env

  frontend:
    image: myapp/frontend:latest
    environment:
      - API_KEY          # Only gets API_KEY, not DB_PASSWORD (least privilege)
```

### 4. Apply changes

When you run `dockform apply`:

1. Dockform decrypts `secrets.env` using SOPS/Age
2. Passes decrypted values to Docker Compose as environment variables
3. Docker Compose injects only the explicitly declared variables into each service
4. Containers receive the secret values as environment variables

### Stack-Specific Secrets

For stack-specific secrets (not shared across all stacks):

```yaml title="dockform.yaml"
stacks:
  web:
    root: ./web
    secrets:
      sops:
        - ./web/secrets.env  # Only available to 'web' stack

  worker:
    root: ./worker
    secrets:
      sops:
        - ./worker/secrets.env  # Only available to 'worker' stack
```

## Doctor checks

Run `dockform doctor` to validate your environment.

- SOPS: verifies the `sops` binary is available.
- GPG: warns if `gpg` is not installed; when present, prints version, attempts to show the agent socket via `gpgconf --list-dirs agent-socket`, and detects loopback support by checking for `--pinentry-mode`.

## Common Issues and Troubleshooting

### Secrets not appearing in containers

**Problem:** You've configured secrets in `dockform.yaml` but they're not available inside your containers.

**Solution:** Make sure you've explicitly declared the environment variables in your `docker-compose.yml`:

```yaml
services:
  myapp:
    image: myapp:latest
    environment:
      - SECRET_KEY      # Add this!
      - DB_PASSWORD     # Add this!
```

Without these declarations, Dockform decrypts the secrets but Docker Compose doesn't know which services should receive them.

### Encrypted values showing in containers

**Problem:** You see encrypted values like `SECRET_KEY=ENC[AES256_GCM,data:...]` inside your container.

**Cause:** You added the encrypted file to `env_file:` in your compose file, causing Docker to read the encrypted file directly.

!!! danger "Don't Use env_file with Encrypted Files"
    ```yaml
    # ❌ WRONG - Don't do this
    services:
      app:
        env_file:
          - secrets.env  # This reads the encrypted file directly!
    ```

    ```yaml
    # ✅ CORRECT - Use environment declarations
    services:
      app:
        environment:
          - SECRET_KEY   # Dockform provides the decrypted value
    ```

**Solution:** Remove the `env_file:` reference and use `environment:` declarations instead. Dockform handles decryption and passes values to Docker Compose automatically.

### Why explicit declarations?

This design follows the **principle of least privilege**:

- **Security:** Not all services should have access to all secrets
- **Clarity:** The compose file documents what each service actually needs
- **Portability:** Your compose file remains functional with standard Docker Compose (using `.env` files for local development)
- **Debugging:** Clear visibility into which services use which secrets

## Using secrets without SOPS (CI-managed)

If you prefer not to use SOPS, you can manage sensitive values via your CI/CD
system’s secret store (e.g., GitHub Actions). Provide secrets as environment
variables at runtime and reference them from Compose or the manifest.

- Set CI environment variables from your secret store.
- Add them to Dockform `environment.inline` to ensure Compose receives them during planning and apply.

=== "dockform.yaml"

    ```yaml
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

=== "app/docker-compose.yaml"

    ```yaml
    services:
      api:
        image: ghcr.io/example/api:latest
        environment:
          # Compose reads values from the process environment (provided by CI or Dockform inline env)
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
          OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
    ```

=== ".github/workflows/deploy.yml"

    ```yaml
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

Notes:

- Environment variable interpolation (`${VAR}`) in `dockform.yaml` occurs at load time using the runner’s environment.
- You can mix CI-managed env vars with SOPS-managed secrets if needed.
