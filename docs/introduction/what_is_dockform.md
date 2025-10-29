---
title: What is Dockform?
---

# What is Dockform?

Dockform extends Docker Compose with a fully declarative workflow.  
It lets you manage not only your Compose stacks, but also the supporting resources that normally sit outside of `docker-compose.yml` — such as external networks, volume lifecycles, secrets, and configuration files.

Think of Dockform as the missing declarative layer for everything you’d otherwise configure manually with commands like `docker network create`, `docker volume create`, or ad-hoc shell scripts. All of it is written as code, stored in a manifest, and applied consistently.

![dockform preview](/img/preview.png)

## Use Cases

Dockform is designed for simple, reproducible deployments where other heavy orchestration tools would be overkill:

- **Single-server deployments** – manage apps and infrastructure in one simple manifest file  
- **Homelabs** – codify personal stacks, keep them reproducible and shareable  
- **Small teams** – bring predictability and consistency to Docker-based workflows  
- **Learning & prototyping** – experiment with declarative infrastructure without added complexity  

## Why Dockform?

- **Declarative by design** – describe your stack once, apply it anywhere  
- **Git-friendly** – version-control both apps and infrastructure resources together  
- **Lightweight** – no extra daemons, clusters, or databases required  
- **Seamless with Compose** – works with existing Compose files without replacing them  
- **Safe & consistent** – avoid manual drift by codifying everything in a single manifest  
