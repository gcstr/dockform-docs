---
title: Debugging & Troubleshooting
icon: lucide/bug-off
---

# Debugging & Troubleshooting

This page covers Dockform's debugging and troubleshooting tools to help you identify and resolve configuration issues, environment problems, and deployment failures.

Dockform provides several diagnostic commands to help you understand what's happening in your setup:

- **Environment validation** - Check your system setup and dependencies
- **Configuration inspection** - Examine how your manifest is processed and resolved
- **Compose debugging** - See exactly what Docker Compose receives after all processing

## Overview of debugging tools

| Command | Purpose | When to use |
|---------|---------|-------------|
| `dockform doctor` | Environment health check | Setup validation, troubleshooting failures |
| `dockform manifest render` | Inspect processed manifest | Debug environment interpolation, validate structure |
| `dockform compose render` | View resolved Compose config | Debug stack-specific issues, inspect final output |
| `--log-file` or `--verbose` | View full execution logs | Debug runtime issues |
| `.dockform/logs/` | Full debug log of every `apply` | After a failed or surprising apply |

## Validation with `doctor`

The `dockform doctor` command performs comprehensive environment and configuration checks to ensure your system is properly set up for Dockform operations. This diagnostic tool helps identify and troubleshoot common setup issues before they cause problems during deployment.

```bash
# Run comprehensive environment diagnostics
$ dockform doctor

# Run with verbose output for detailed information
$ dockform doctor -v

# Check specific configuration file
$ dockform doctor --manifest ./path/to/dockform.yml
```

### What it checks

The doctor command performs a comprehensive health check of your Dockform environment. It validates that Docker and Docker Compose are accessible, checks for required dependencies like SOPS and encryption backends (Age/GnuPG), verifies your manifest configuration and file structure, and tests Docker permissions for network and volume operations. The command provides clear pass/warn/fail status for each check, helping you quickly identify and resolve setup issues before they impact your deployments.

When it finds a manifest, doctor checks that **every context in it** is reachable, all at once, with a 10 second limit per context, so a host that's down shows up as a failed check instead of hanging the scan. Pass `--context <name>` to check just that one. Without a manifest, it checks the active Docker context.

### Example output
<div style="font-size: 11px">
  <pre>
  <span style="color:#22c55e;">$</span><span style="font-weight:bold;"> dockform doctor</span>
  Dockform (v0.10.0) Doctor: health scan
  Context: default  •  Host: unix:///var/run/docker.sock

  │ <span style="color:#22c55e;">✓</span> <span style="color:#3b82f6;">[engine]</span> Docker Engine reachable: v29.8.1
  │ <span style="color:#22c55e;">✓</span> <span style="color:#3b82f6;">[context:default]</span> Context &quot;default&quot; reachable: ok
  │ <span style="color:#22c55e;">✓</span> <span style="color:#3b82f6;">[context:server-one]</span> Context &quot;server-one&quot; reachable: ok
  │ <span style="color:#22c55e;">✓</span> <span style="color:#3b82f6;">[compose]</span> Docker Compose plugin: 5.5.1
  │ <span style="color:#22c55e;">✓</span> <span style="color:#3b82f6;">[sops]</span> SOPS present: sops 3.11.0
  │ <span style="color:#22c55e;">✓</span> <span style="color:#3b82f6;">[helper]</span> Helper image present: alpine:3.22
  │ <span style="color:#22c55e;">✓</span> <span style="color:#3b82f6;">[net-perms]</span> Network create/remove: ok
  │ <span style="color:#22c55e;">✓</span> <span style="color:#3b82f6;">[vol-perms]</span> Volume create/remove: ok

  Summary: 8 checks • 8 PASS, 0 WARN, 0 FAIL
  All good!
  Completed in 0.6s • exit code 0
  </pre>
</div>

### Integration with workflows

The doctor command is designed to be used:

- **Before deployment**: Run `dockform doctor` before `plan` or `apply` to catch issues early
- **In CI/CD pipelines**: Add as a validation step to ensure environment consistency
- **During troubleshooting**: When Dockform operations fail unexpectedly
- **After environment changes**: When updating Docker, SOPS, or key configurations

### CI/CD usage

In CI environments, use doctor to validate your setup:

```yaml title="workflow.yaml"
- name: Validate Dockform environment
  run: dockform doctor -v
  env:
    AGE_KEY_FILE: /tmp/age-key.txt
```

The command exits with a non-zero status code if critical errors are found, making it suitable for CI pipeline gates.

## Configuration inspection

### Manifest rendering

Render the manifest with environment variable interpolation applied. Any missing `${VAR}` will be replaced with an empty string and reported as a warning.

```bash
# From the directory containing your manifest
dockform manifest render

# Or specify a path (file or directory); discovery order:
# dockform.yml, dockform.yaml, Dockform.yml, Dockform.yaml
dockform manifest render --manifest ./path/to/dir
dockform manifest render --manifest ./path/to/dockform.yml
```

- **TTY behavior**: Opens a fullscreen pager with highlighted YAML and line numbers.
- **Non‑TTY behavior**: Prints plain YAML with a trailing newline; safe to pipe.
- **Warnings**: Missing environment variables used in ${VAR} are listed.

Examples:

```bash
# Pipe the interpolated manifest to a file
dockform manifest render --manifest ./infra > manifest.debug.yml

# Grep for resolved values
dockform manifest render | grep identifier
```

### Compose rendering

Render the fully-resolved Docker Compose configuration for a specific stack as defined in your Dockform manifest. This command:

- **Loads manifest config** (project, profiles, env files, inline env, SOPS).
- **Resolves stack root** and all referenced compose files.
- **Merges multiple compose files** and normalizes to a single YAML.
- **Interpolates compose-style variables**: `${VAR}`, `${VAR:-default}`, `${VAR:?err}`.
- **Respects profiles/extends/anchors** via docker compose config.
- **Masks secrets by default** in the output; opt-in to show them.

Usage:

```bash
# Render an app by name (from your manifest’s stacks map)
dockform compose render myapp

# Optional flags
dockform compose render myapp --mask full            # default
dockform compose render myapp --mask partial         # keep 2+2 chars
dockform compose render myapp --mask preserve-length # same length as original
dockform compose render myapp --show-secrets         # OPT-IN: disable masking

# Respect a non-default manifest path
dockform compose render myapp --manifest ./envs/prod
```

- **TTY behavior**: Opens a fullscreen pager with highlighted YAML, line numbers, and a relative file title (e.g., File: apps/web/docker-compose.yml). If multiple files are merged, the title shows a suffix like (+N).
- **Non‑TTY behavior**: Prints plain YAML; safe to pipe and redirect.
- **Secret masking** (default): Values for key patterns like password, secret, token, key, apikey are masked. Use `--mask` to control the strategy or `--show-secrets` to disable masking entirely.

Examples:

```bash
# Save the fully-resolved compose to inspect diffs
dockform compose render api > compose.debug.yml

# Preview with partial masking
dockform compose render api --mask partial | less -R

# Force showing secrets (e.g., in CI logs avoid using this)
dockform compose render api --show-secrets
```

!!! Danger
    **Avoid rendering secrets**  
    Only use `--show-secrets` when absolutely necessary, and never redirect unmasked output to plain text files (e.g., `compose.debug.yml`). Prefer masked output or secure secret handling to reduce exposure risk.

## Rendering behavior

Both `manifest render` and `compose render` commands share common behavior patterns:

### TTY vs Non-TTY output

- **TTY behavior**: Opens a fullscreen pager with YAML syntax highlighting, line numbers, and a header showing the file path relative to your current working directory. Press `q` to quit, `↑`/`↓`/`PgUp`/`PgDn`/`j`/`k` to scroll.
- **Non-TTY behavior**: Prints plain YAML with a trailing newline (no ANSI codes), safe to pipe to grep, jq, or redirect to files.

### Tips for effective debugging

- **Pager navigation**: If the pager opens, press `q` to exit. Use `?` inside some terminals for key hints.
- **File orientation**: Titles display relative paths from your current working directory for quick orientation.
- **Pipeline-friendly**: All render commands work well with standard Unix tools:

```bash
# Search for specific values
dockform manifest render | grep identifier

# Save for inspection
dockform compose render api > debug-compose.yml

# Process with jq (if converted to JSON)
dockform manifest render | yq eval -o=json | jq '.stacks'
```

## Logging and verbose output

Dockform provides comprehensive logging capabilities to help you understand what's happening during operations and troubleshoot issues.

### Verbose mode

Enable verbose output to get detailed information about Dockform's operations:

```bash
# Enable verbose output for most commands
dockform plan -v
dockform apply --verbose
dockform doctor -v
```

Verbose mode provides additional details about configuration loading and validation steps, environment variable resolution, Docker operations and API calls, file system operations, SOPS encryption/decryption processes, and error context with stack traces.

### Log levels and formats

Control the amount and format of log output:

```bash
# Set log level (debug, info, warn, error)
dockform apply --log-level debug

# Choose log format (auto, pretty, json)
dockform apply --log-format json

# Disable colors in output
dockform apply --no-color
```

**Log levels:**

| Level   | Description                                                     |
|---------|-----------------------------------------------------------------|
| `debug` | Most verbose, includes internal operations and API calls        |
| `info`  | Standard operational messages (default)                         |
| `warn`  | Warnings and potential issues                                   |
| `error` | Only errors and failures                                        |

**Log formats:**

| Format   | Description                                                      |
|----------|------------------------------------------------------------------|
| `auto`   | Automatically chooses pretty for TTY, JSON for non-TTY (default) |
| `pretty` | Human-readable colored output with timestamps                    |
| `json`   | Structured JSON logs suitable for log aggregation systems        |

### Writing logs to file

Capture logs to a file for later analysis or sharing:

```bash
# Write JSON logs to file (in addition to stderr)
dockform apply --log-file dockform.log

# Combine with specific log level and format
dockform plan --log-file debug.log --log-level debug --log-format json

# Useful for CI/CD environments
dockform apply --log-file /tmp/deployment.log --log-level info
```

The log file always uses JSON format regardless of the `--log-format` setting, making it easy to parse and analyze programmatically.

### Run logs

Every `dockform apply` writes a complete log of the run to
`.dockform/logs/apply-<timestamp>.log` next to your manifest, so you never need
to re-run a failed apply just to see what happened. When an apply fails, its
summary tells you the path.

- The run log is always at `debug` level, whatever `--log-level` says, and always JSON.
- Dockform keeps the 10 newest run logs and deletes older ones. It never touches other files in that directory.
- If the manifest directory isn't writable, the log goes to your user config directory instead (`~/.config/dockform/logs` on Linux) and Dockform tells you where.
- `--log-file` replaces the run log rather than adding a second copy.
- Only your user can read the logs: the log directory is created `0700` and each log file `0600`.

Run logs can contain details about your hosts, so keep them out of git.
`dockform init` adds `.dockform/` to your `.gitignore`, and `apply` warns if the
directory isn't ignored.

!!! Note "Log analysis tips"
    - **Use `jq` for JSON logs**: `cat dockform.log | jq '.level, .msg'`
    - **Filter by log level**: `cat dockform.log | jq 'select(.level == "error")'`
    - **Search for specific operations**: `grep -i "docker\|sops\|compose" dockform.log`
    - **Combine with timestamps**: JSON logs include precise timestamps for operation timing analysis

## Additional troubleshooting

### Docker Compose issues

For troubleshooting docker compose config errors independently:

- `docker compose -f <file> config` - validate and resolve a specific Compose file
- `docker compose config --quiet` - suppress warnings during validation

### Unreachable contexts

Before doing any work, Dockform probes every **selected** context's Docker daemon.
If one is unreachable, the command **fails fast** with a clear, aggregated error:

```
Error: 2 contexts are unreachable:
  • server-one: timed out after 10s
  • server-three: timed out after 10s
Check the hosts are up and your Docker contexts are correct (docker context ls).
```

This is **all-or-nothing**: if any selected context is down, the command stops
(exit code `69`) rather than partially applying. To operate on just the reachable
hosts, narrow the scope with `--context`:

```bash
# Apply only to the contexts that are up
dockform apply --context server-two
```

`dockform doctor` checks every context in your manifest the same way, so it's a
quick way to see which hosts are down. To check a single host, pass
`--context hetzner-one`. If a *reachable* context is merely slow, see
[Performance over SSH](performance_over_ssh.md).

When one context fails partway through an `apply`, the other contexts finish the
work they already started instead of being cut off. The command still exits with
an error.

### Reading apply errors

When `docker compose` fails, Dockform shows what compose actually printed and
only adds a hint when that output supports it. Hints cover the common cases:
registry authentication, a missing image, SSH session limits and SSH tunnel
failures. If there is no hint, the compose message above it is the thing to read.

### Best-effort steps

Some steps are allowed to fail without stopping the run, for example when SSH
multiplexing can't be set up or when `images check` can't read running image
digests on a context. Dockform logs a warning when that happens, so a degraded
run is visible instead of silently slower or less accurate.

## Quick reference

### When to use which tool

| Scenario | Recommended command | Purpose |
|----------|-------------------|---------|
| **Initial setup** | `dockform doctor` | Validate environment and dependencies |
| **Configuration not working** | `dockform manifest render` | Check environment interpolation and structure |
| **App-specific issues** | `dockform compose render <app>` | Inspect final Compose configuration |
| **Secrets not loading** | `dockform doctor` + `dockform compose render --show-secrets` | Validate SOPS setup and check secret injection |
| **Environment variables missing** | `dockform manifest render` | See which variables are unresolved |
| **Compose syntax errors** | `docker compose -f <file> config` | Validate raw Compose files |
| **Operation failures** | `dockform <cmd> -v --log-level debug` | Get detailed operation logs |
| **CI/CD debugging** | `dockform <cmd> --log-file logs.json --no-color` | Capture structured logs for analysis |
| **Performance issues** | `dockform <cmd> --log-level debug --log-file timing.log` | Analyze operation timing and bottlenecks |

### Common debugging workflow

1. **Start with environment validation**: `dockform doctor` to ensure all dependencies are properly configured
2. **Check manifest processing**: `dockform manifest render` to verify environment interpolation
3. **Inspect stack config**: `dockform compose render <app>` to see the final configuration
4. **Test deployment**: `dockform plan` to preview changes before applying

This systematic approach helps identify issues at each layer of Dockform's processing pipeline.
