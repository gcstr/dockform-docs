---
title: Getting Started
---

# Getting Started

This guide will help you set up Dockform, initialize your first project, and understand the basic structure of a Dockform-managed stack.

## Installation

### Prerequisites

Before you begin, make sure you have the following installed:

- [Go](https://go.dev/) (if you want to build Dockform from source)  
- [SOPS](https://github.com/getsops/sops) and [Age](https://github.com/FiloSottile/age) (required for secrets management)  
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)  

### Homebrew

On macOS or Linux, you can install Dockform using [Homebrew](https://brew.sh/):

```sh [shell ~vscode-icons:file-type-shell~]
$ brew tap gcstr/dockform
$ brew install dockform
```

### Precompiled binaries

Precompiled binaries for Linux, macOS, and Windows are available on the [GitHub Releases](https://github.com/gcstr/dockform/releases) page.  
Download the binary for your platform, extract it, and place it somewhere in your `PATH`.

---

## Initialize a Project

Dockform includes a convenience command to scaffold a new project:

```sh [shell ~vscode-icons:file-type-shell~]
dockform init
```

This will create a starter `dockform.yml` manifest file in your project directory.

## Project Structure

A typical Dockform project might look like this:

```
my-project/
├── dockform.yml
├── app1/
│   ├── docker-compose.yml
│   └── secrets.env
├── app2/
│   ├── config/
│   │   └── config.toml
│   └── docker-compose.yml
└── app3/
    └── docker-compose.yml
```

Each stack (`app1`, `app2`, `app3`) has its own folder containing one or more Compose files and optional configuration. The `dockform.yml` manifest ties everything together.

---

## Next Steps

To learn more about the manifest file and its configuration options, see [The Manifest File](/manifest/overview).