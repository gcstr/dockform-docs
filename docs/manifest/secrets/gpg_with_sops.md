---
title: GnuPG (PGP) with SOPS
icon: lucide/rectangle-ellipsis
---

# GnuPG (PGP) with SOPS

Dockform supports encrypting secrets with SOPS using the **PGP (GnuPG)** backend, in addition to **Age**. This page explains configuration, workflows, CI patterns, and troubleshooting.

## Prerequisites

- `sops` installed
- `gpg` (GnuPG) installed if you plan to use PGP
- A GnuPG keyring populated with the recipient public keys (and private keys for decryption where needed)

!!!Tip

    Run `dockform doctor` to confirm:

    - SOPS presence
    - GnuPG version, agent socket path, and loopback support

## Configuration

Define PGP options under `sops.pgp`:

```yaml title="dockform.yaml"
sops:
  pgp:
    keyring_dir: "~/.gnupg"      # GNUPGHOME; supports ~/ expansion
    recipients: ["0xFPR...", "user@example.com"]
    use_agent: true               # use gpg-agent/pinentry
    pinentry_mode: default        # or loopback for headless
    passphrase: "${GPG_PASSPHRASE}" # optional; used in loopback flows
```

You can combine with Age recipients:

```yaml title="dockform.yaml"
sops:
  age:
    key_file: ${AGE_KEY_FILE}
    recipients: ["age1..."]
  pgp:
    keyring_dir: "~/.gnupg"
    recipients: ["0xFPR..."]
```

Dockform passes both sets to SOPS: `--age=<list>` and `--pgp=<list>`.

## Commands

- Create: `dockform secrets create secrets.env`
- Edit: `dockform secrets edit secrets.env`
- Decrypt: `dockform secrets decrypt secrets.env`
- Rekey: `dockform secrets rekey`

All commands honor `sops.pgp.*` and `sops.age.*` settings.

## CI and Headless Usage

For headless runners without interactive pinentry, use loopback mode:

```yaml title="dockform.yaml"
sops:
  pgp:
    keyring_dir: "/opt/ci/gnupg"
    recipients: ["0xFPR..."]
    use_agent: false
    pinentry_mode: loopback
    passphrase: ${GPG_PASSPHRASE}
```

!!! tip "Note"

    - Dockform sets `GNUPGHOME` to `keyring_dir` for the SOPS subprocess.
    - With `pinentry_mode: loopback` and `use_agent: false`, Dockform sets `SOPS_GPG_EXEC="gpg --pinentry-mode loopback"` so SOPS invokes GnuPG in loopback mode.

## Troubleshooting

- GPG not found: Install GnuPG (`gpg`). `dockform doctor` will warn if missing.
- Loopback errors: Ensure GnuPG ≥ 2.1 and that `--pinentry-mode` is supported.
- Keyring not found: Verify `sops.pgp.keyring_dir` (Dockform sets `GNUPGHOME`). Paths with `~/` are expanded.
- Mixed recipients: If any Age recipients are invalid (no `age1` prefix), Dockform surfaces a clear validation error before calling SOPS.

## Security considerations

- Prefer using `gpg-agent` and standard pinentry on developer machines.
- For CI, keep `GPG_PASSPHRASE` scoped and ephemeral; avoid logging plaintext values.
- Commit only encrypted files. Never commit temporary plaintext copies.
