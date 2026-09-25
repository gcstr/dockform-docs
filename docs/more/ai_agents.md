---
title: AI Agents
icon: lucide/bot
---

# AI Agents

AI coding agents can write manifests and run Dockform for you, but only if they know how Dockform works: the directory layout, the manifest keys, and which commands are safe to run. `dockform llm` prints all of that in one compact Markdown guide, sized to fit in an agent's context.

## What `dockform llm` prints

```bash
dockform llm
```

- **How it works**: labels are the state, `plan` before `apply`, contexts are hosts, and the `<context>/<stack>/` discovery layout.
- **Manifest reference**: one annotated `dockform.yml` naming every key.
- **Commands**: one line per command, with the flags that matter.
- **Common tasks**: adding a stack or a secret, shipping config files, updating images.
- **Rules for agents**: show `plan` before `apply`, never `destroy` unless asked, never print secret values, no local bind mounts on remote hosts.
- **This project**: run inside a project, the guide ends with its contexts, stacks, env and secrets files, filesets, and any warnings.

The project section is built from the manifest and the stack directories on your machine. Dockform doesn't contact any Docker host for it, and it shows names and paths, never secret values. Use `--no-project` to leave it out.

The guide matches the Dockform version you have installed, so an agent never learns flags or keys your version doesn't have.

## Load it automatically

Run this once in your repository:

```bash
dockform llm setup
```

It does three things:

| File | Change |
|---|---|
| `AGENTS.md` | Adds a short Dockform block telling agents to run `dockform llm` and follow its rules. Created if missing. |
| `CLAUDE.md` | The same block, if the file exists. |
| `.claude/settings.json` | A `SessionStart` hook that runs `dockform llm`, so Claude Code starts every session with the guide already loaded. |

The block is marked, so running `setup` again updates it in place, and the hook is added only once. Everything else in these files is left alone. Pass `--no-hook` to skip the Claude Code hook.

`dockform init` reminds you of this command after creating a manifest.

!!! tip "Commit the changes"
    Commit `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` so everyone working in the repository, and every agent, gets the same setup.
