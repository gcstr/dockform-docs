---
title: End-to-End Tutorial
icon: lucide/graduation-cap
---

# End-to-End Tutorial

This tutorial walks through a complete Dockform project from scratch. By the end, you'll have two services running on two separate servers, managed declaratively from a single manifest.

## What We're Building

We'll deploy a small infrastructure across two Debian servers:

| Server | Stack | Concepts Covered |
|--------|-------|------------------|
| `debian-one` | **Website** — nginx serving static HTML | Filesets, auto-discovery |
| `debian-two` | **Vaultwarden** — self-hosted password manager | Secrets (SOPS/age), volumes |

Along the way we'll also cover **targeted deployments**, **day-two updates**, and as a bonus, adding **Traefik** as a reverse proxy.

```
tutorial/
├── dockform.yaml
├── debian-one/
│   └── website/
│       ├── compose.yaml
│       └── volumes/
│           └── html/
│               ├── index.html
│               └── css/
│                   └── style.css
└── debian-two/
    └── vaultwarden/
        ├── compose.yaml
        └── secrets.env          # SOPS-encrypted
```

## Prerequisites

Before starting, make sure you have:

- **Two servers** with Docker installed (any Linux distribution works)
- **SSH access** to both servers from your workstation
- **Dockform** installed — see [Getting Started](getting_started.md#installation)
- **SOPS** and **age** installed — for encrypting secrets

!!! tip "No servers?"
    You can follow along with a single machine by using `default` as your only context and skipping the multi-context parts. The concepts are the same.

---

## Step 1: Create the Project

Create a project directory and initialize it:

```bash
mkdir tutorial && cd tutorial
dockform init
```

This creates a starter `dockform.yaml`. Replace its contents with:

```yaml title="dockform.yaml"
identifier: tutorial

contexts:
  debian-one:
    host: ssh://deploy@debian-one
```

That's all you need to start. The `identifier` labels every resource Dockform creates, and the `contexts` block tells Dockform which Docker daemons to manage.

!!! note
    The `host:` field makes your manifest portable — anyone who clones this project can deploy without configuring Docker contexts first. You can also omit `host:` and use a pre-configured [Docker context](https://docs.docker.com/engine/manage-resources/contexts/) by matching the key name.

### Create the Directory Structure

Create the website stack directory and its fileset:

```bash
mkdir -p debian-one/website/volumes/html/css
```

Dockform discovers stacks from the directory structure: each subdirectory under a context that contains a `compose.yaml` becomes a stack.

---

## Step 2: Deploy a Website

### The Compose File

Create a simple nginx compose file:

```yaml title="debian-one/website/compose.yaml"
services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - html:/usr/share/nginx/html:ro

volumes:
  html:
    external: true
```

The `html` volume is declared as `external: true` — this tells Compose not to create it. Dockform manages it instead.

### Add Content with Filesets

Create a simple landing page and stylesheet:

```html title="debian-one/website/volumes/html/index.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main>
    <h1>Hello from Dockform</h1>
    <p>This page is synced via a fileset.</p>
  </main>
</body>
</html>
```

```css title="debian-one/website/volumes/html/css/style.css"
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; background: #f8f9fa; }
main { text-align: center; }
h1 { margin-bottom: 0.5rem; }
```

Because these files live under `volumes/html/`, Dockform automatically discovers a fileset named `html`. It will:

1. Create a Docker volume called `html` on `debian-one`
2. Sync the contents of `volumes/html/` into it
3. Track changes via a content index so future syncs are incremental

!!! tip "Why not bind mounts?"
    Bind mounts with relative paths (e.g., `./html:/usr/share/nginx/html`) don't work with remote Docker contexts — the path resolves on the server, not your workstation. Filesets solve this by transferring files to Docker volumes.

### Preview the Plan

```bash
dockform plan
```

```
│ Context: debian-one
│ Identifier: tutorial

Stacks
  debian-one/website
    + nginx will be created

Filesets
  debian-one/website/html
    + 2 files to sync

Plan: 1 to create, 0 to change, and 0 to destroy
```

Dockform shows exactly what will happen: one service created and two files synced.

### Apply

```bash
dockform apply
```

Dockform creates the volume, syncs the files, and runs `docker compose up`. Your website is now live at `http://debian-one`.

---

## Step 3: Deploy Vaultwarden

Now let's add a second server with [Vaultwarden](https://github.com/dani-garcia/vaultwarden), the self-hosted Bitwarden-compatible password manager.

### Update the Manifest

Add `debian-two` as a new context with a volume for Vaultwarden's persistent data:

```yaml title="dockform.yaml"
identifier: tutorial

contexts:
  debian-one:
    host: ssh://deploy@debian-one
  debian-two:
    host: ssh://deploy@debian-two
    volumes:
      vaultwarden-data: {}
```

Unlike fileset volumes (which are auto-discovered), the `vaultwarden-data` volume stores application data that Vaultwarden writes at runtime. We declare it explicitly so Dockform creates it before the stack starts.

### Create the Stack

```bash
mkdir -p debian-two/vaultwarden
```

```yaml title="debian-two/vaultwarden/compose.yaml"
services:
  vaultwarden:
    image: vaultwarden/server:1.32.7-alpine
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      DOMAIN: "https://vault.example.com"
      SIGNUPS_ALLOWED: "false"
    volumes:
      - vaultwarden-data:/data

volumes:
  vaultwarden-data:
    external: true
```

Plain environment variables like `DOMAIN` and `SIGNUPS_ALLOWED` go directly in the compose file — they're not sensitive. But Vaultwarden also needs an admin token and SMTP credentials. Those are secrets.

### Encrypt Secrets with SOPS

#### Generate an age Key

If you don't have an age key yet:

```bash
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt
```

```
Public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Set the environment variable pointing to your key:

```bash
export AGE_KEY_FILE=~/.config/sops/age/keys.txt
```

#### Configure SOPS in the Manifest

Add the `sops` block:

```yaml title="dockform.yaml" hl_lines="3-5"
identifier: tutorial

sops:
  age:
    key_file: ${AGE_KEY_FILE}

contexts:
  debian-one:
    host: ssh://deploy@debian-one
  debian-two:
    host: ssh://deploy@debian-two
    volumes:
      vaultwarden-data: {}
```

#### Create the Encrypted Secrets File

```bash
dockform secrets create debian-two/vaultwarden/secrets.env
```

This creates a SOPS-encrypted dotenv file. Edit it:

```bash
dockform secrets edit debian-two/vaultwarden/secrets.env
```

Your `$EDITOR` opens with the decrypted content. Add the secrets:

```env
ADMIN_TOKEN=$argon2id$v=19$m=65540,t=3,p=4$your-hashed-admin-token
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_FROM=vault@example.com
SMTP_USERNAME=vault@example.com
SMTP_PASSWORD=your-smtp-password
```

Save and close. The file is re-encrypted automatically. You can safely commit it to Git — only someone with the age private key can decrypt it.

!!! note "How secrets reach the container"
    Dockform decrypts `secrets.env` at deploy time and passes the values as inline environment variables to `docker compose up`. No temporary files are written to disk on the server.

Because the file is named `secrets.env` and lives inside the stack directory, Dockform discovers it automatically — no extra manifest configuration needed.

### Deploy to debian-two Only

You don't need to redeploy the website. Target just the new context:

```bash
dockform apply --context debian-two
```

Dockform creates the `vaultwarden-data` volume, decrypts the secrets, and starts Vaultwarden. It's now accessible at `http://debian-two:8080`.

---

## Step 4: Targeted Operations

Dockform supports three levels of targeting:

### By Context

Deploy or plan changes for a single server:

```bash
dockform plan --context debian-one
dockform apply --context debian-two
```

### By Stack

Target a specific stack:

```bash
dockform apply --stack debian-two/vaultwarden
```

### By Deployment

Define named groups in your manifest for common operations:

```yaml title="dockform.yaml (excerpt)"
deployments:
  website:
    description: Deploy the website only
    stacks:
      - debian-one/website
  all:
    description: Deploy everything
    contexts:
      - debian-one
      - debian-two
```

Then use:

```bash
dockform apply --deployment website
```

!!! tip
    Use `dockform plan` with the same targeting flags to preview what would change before applying.

---

## Step 5: Day-Two Updates

### Updating the Website

Edit the HTML:

```html title="debian-one/website/volumes/html/index.html" hl_lines="9"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main>
    <h1>Hello from Dockform</h1>
    <p>Updated: now with more content.</p>
  </main>
</body>
</html>
```

Preview the changes:

```bash
dockform plan --stack debian-one/website
```

```
│ Context: debian-one
│ Identifier: tutorial

Filesets
  debian-one/website/html
    ~ 1 file changed

Plan: 0 to create, 1 to change, and 0 to destroy
```

Dockform detects that only `index.html` changed. Apply:

```bash
dockform apply --stack debian-one/website
```

Only the changed file is synced — unchanged files are skipped entirely.

### Updating Secrets

To rotate Vaultwarden's admin token:

```bash
dockform secrets edit debian-two/vaultwarden/secrets.env
```

Change the value, save, and redeploy:

```bash
dockform apply --stack debian-two/vaultwarden
```

### Viewing Status

Launch the interactive dashboard:

```bash
dockform dashboard
```

This shows a live view of all containers across all contexts.

---

## Bonus: Adding Traefik

A reverse proxy gives you TLS termination and domain-based routing. Here we'll add [Traefik](https://traefik.io/) to `debian-one`. This section focuses on the Dockform parts — refer to the [Traefik documentation](https://doc.traefik.io/traefik/) for details on its configuration.

### Create the Traefik Stack

```bash
mkdir -p debian-one/traefik/volumes/config
```

```yaml title="debian-one/traefik/compose.yaml"
services:
  traefik:
    image: traefik:v3
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - traefik
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - config:/etc/traefik:ro
      - letsencrypt:/letsencrypt

networks:
  traefik:
    external: true

volumes:
  config:
    external: true
  letsencrypt:
```

The `config` volume is a fileset — Dockform syncs the Traefik configuration from `volumes/config/`. The `letsencrypt` volume is managed by Traefik itself (for storing ACME certificates) so it doesn't need to be external.

### Add the Traefik Configuration

```yaml title="debian-one/traefik/volumes/config/traefik.yaml"
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false
    network: traefik

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

### Update the Manifest

Add a `traefik` network to `debian-one`:

```yaml title="dockform.yaml" hl_lines="8-9"
identifier: tutorial

sops:
  age:
    key_file: ${AGE_KEY_FILE}

contexts:
  debian-one:
    host: ssh://deploy@debian-one
    networks:
      traefik: {}
  debian-two:
    host: ssh://deploy@debian-two
    volumes:
      vaultwarden-data: {}
```

### Update the Website to Use Traefik

Replace port mapping with Traefik labels:

```yaml title="debian-one/website/compose.yaml"
services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    networks:
      - traefik
    volumes:
      - html:/usr/share/nginx/html:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.website.rule=Host(`example.com`)"
      - "traefik.http.routers.website.entrypoints=websecure"
      - "traefik.http.routers.website.tls.certresolver=letsencrypt"
      - "traefik.http.services.website.loadbalancer.server.port=80"

networks:
  traefik:
    external: true

volumes:
  html:
    external: true
```

### Deploy

```bash
dockform apply --context debian-one
```

Dockform creates the `traefik` network, syncs the Traefik config fileset, starts Traefik, and updates the website stack. Your site is now served over HTTPS.

!!! tip "Routing to debian-two"
    A single Traefik instance can route to services on other servers using [file-based dynamic configuration](https://doc.traefik.io/traefik/providers/file/). Define load balancer URLs pointing to `debian-two`'s IP address — Traefik doesn't need to run on every server.

---

## Full Project Reference

### Final Directory Structure

```
tutorial/
├── dockform.yaml
├── debian-one/
│   ├── traefik/
│   │   ├── compose.yaml
│   │   └── volumes/
│   │       └── config/
│   │           └── traefik.yaml
│   └── website/
│       ├── compose.yaml
│       └── volumes/
│           └── html/
│               ├── index.html
│               └── css/
│                   └── style.css
└── debian-two/
    └── vaultwarden/
        ├── compose.yaml
        └── secrets.env              # SOPS-encrypted
```

### Final Manifest

```yaml title="dockform.yaml"
identifier: tutorial

sops:
  age:
    key_file: ${AGE_KEY_FILE}

contexts:
  debian-one:
    host: ssh://deploy@debian-one
    networks:
      traefik: {}
  debian-two:
    host: ssh://deploy@debian-two
    volumes:
      vaultwarden-data: {}

deployments:
  website:
    description: Deploy the website only
    stacks:
      - debian-one/website
  all:
    description: Deploy everything
    contexts:
      - debian-one
      - debian-two
```

### What Dockform Manages

| Resource | Type | Server | How |
|----------|------|--------|-----|
| `html` | Volume (fileset) | debian-one | Auto-discovered from `volumes/html/` |
| `config` | Volume (fileset) | debian-one | Auto-discovered from `volumes/config/` |
| `traefik` | Network | debian-one | Declared in manifest |
| `vaultwarden-data` | Volume | debian-two | Declared in manifest |
| Secrets | Inline env | debian-two | Auto-discovered from `secrets.env` |

### Commands Cheatsheet

| Command | What it Does |
|---------|-------------|
| `dockform plan` | Preview all changes across both servers |
| `dockform apply` | Apply all changes |
| `dockform apply --context debian-one` | Deploy only to debian-one |
| `dockform apply --stack debian-two/vaultwarden` | Deploy only Vaultwarden |
| `dockform apply --deployment website` | Deploy the website group |
| `dockform secrets edit <file>` | Edit encrypted secrets |
| `dockform dashboard` | Live container monitoring |
| `dockform destroy` | Tear down all managed resources |

## Next Steps

- [Filesets](../manifest/filesets/) — Ownership, permissions, exclude patterns, cold mode
- [Secrets](../manifest/secrets/) — Multi-recipient encryption, team workflows, CI setup
- [Snapshots & Restore](../more/snapshots_and_restore/) — Back up and restore volume data
- [Best Practices](../more/best_practices/) — Production recommendations
