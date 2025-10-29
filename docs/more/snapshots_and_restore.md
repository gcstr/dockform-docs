---
title: Snapshots and Restore
---

# Snapshots and Restore

Dockform provides powerful volume snapshot and restore capabilities that allow you to backup and restore Docker volumes with full metadata preservation and integrity checking. This feature is essential for data protection, migration, and testing workflows.

## Overview

The snapshot and restore system in Dockform:

- **Creates compressed snapshots** of Docker volumes using zstd compression
- **Preserves metadata** including volume specifications, checksums, and creation details
- **Handles container lifecycle** by automatically stopping and restarting containers during restore
- **Validates integrity** through SHA-256 checksums and spec hash verification
- **Supports both formats** - compressed `.tar.zst` and uncompressed `.tar` files

## Creating Snapshots

### Basic Usage

```bash
dockform volume snapshot <volume-name>
```

This creates a snapshot of the specified volume in the default location: `./.dockform/snapshots/` relative to your manifest file.

### Advanced Options

```bash
# Specify custom output directory
dockform volume snapshot myapp_data -o /backup/volumes/

# Add a descriptive note to the snapshot metadata
dockform volume snapshot myapp_data --note "Before major upgrade to v2.0"
```

### Snapshot Structure

Each snapshot consists of two files:

1. **Data file**: `YYYY-MM-DDTHH-MM-SSZ__spec-XXXXXXXX.tar.zst`
   - Contains the compressed volume data
   - Uses zstd compression for optimal size and speed
   - Preserves file permissions, ownership, and extended attributes

2. **Metadata file**: `YYYY-MM-DDTHH-MM-SSZ__spec-XXXXXXXX.json`
   - Contains snapshot metadata and integrity information
   - Includes volume specification hash for compatibility checking
   - Stores checksums for data validation

### Snapshot Metadata

The JSON metadata file includes:

```json
{
  "dockform_version": "0.5.1",
  "created_at": "2023-10-04T15:30:45Z",
  "volume_name": "myapp_data",
  "spec_hash": "a1b2c3d4",
  "driver": "local",
  "driver_opts": {},
  "labels": {
    "io.dockform.identifier": "myproject"
  },
  "uncompressed_bytes": 1048576,
  "file_count": 42,
  "checksum": {
    "algo": "sha256",
    "tar_zst": "sha256_hash_here"
  },
  "notes": "Before major upgrade to v2.0"
}
```

## Restoring Snapshots

### Prerequisites

Before restoring a snapshot:

1. **Volume must exist** in your Dockform manifest
2. **Volume must be created** in Docker (run `dockform apply` first)
3. **Consider container state** - containers using the volume may need to be stopped

### Basic Restore

```bash
dockform volume restore <volume-name> <snapshot-path>
```

Example:
```bash
dockform volume restore myapp_data ./.dockform/snapshots/myapp_data/2023-10-04T15-30-45Z__spec-a1b2c3d4.tar.zst
```

### Restore Options

```bash
# Force overwrite non-empty volumes
dockform volume restore myapp_data snapshot.tar.zst --force

# Automatically stop containers using the volume
dockform volume restore myapp_data snapshot.tar.zst --stop-containers
```

### Container Management During Restore

Dockform intelligently handles containers that are using the target volume:

1. **Detection**: Identifies all containers (running and stopped) using the volume
2. **Validation**: Requires `--stop-containers` flag if containers are found
3. **Graceful shutdown**: Stops running containers before restore
4. **Automatic restart**: Restarts previously running containers after successful restore
5. **Error recovery**: Attempts to restart containers even if restore fails

## Safety Features

### Integrity Validation

Dockform performs multiple validation checks:

- **Checksum verification**: SHA-256 hash validation of snapshot data
- **Spec hash comparison**: Warns if volume specification has changed
- **File format validation**: Ensures snapshot file has correct extension
- **Manifest validation**: Confirms volume is defined in Dockform manifest

### Non-Empty Volume Protection

By default, Dockform prevents accidental data loss:

```bash
# This will fail if the volume contains data
dockform volume restore myapp_data snapshot.tar.zst

# Use --force to overwrite existing data
dockform volume restore myapp_data snapshot.tar.zst --force
```

### Container State Management

Restore operations require explicit handling of containers:

```bash
# This will fail if containers are using the volume
dockform volume restore myapp_data snapshot.tar.zst

# Use --stop-containers to handle automatically
dockform volume restore myapp_data snapshot.tar.zst --stop-containers
```

## Best Practices

### Snapshot Management

1. **Regular snapshots**: Create snapshots before major changes
   ```bash
   dockform volume snapshot myapp_data --note "Before v2.0 upgrade"
   ```

2. **Organized storage**: Use descriptive output directories
   ```bash
   dockform volume snapshot myapp_data -o /backups/$(date +%Y-%m)
   ```

3. **Retention policy**: Implement automated cleanup of old snapshots

### Restore Workflows

1. **Test restores**: Regularly test restore procedures in non-production environments

2. **Staged approach**: For production restores, consider:
   ```bash
   # 1. Stop stack containers
   docker compose stop app

   # 2. Restore data volume
   dockform volume restore myapp_data backup.tar.zst --force

   # 3. Start containers
   docker compose start app
   ```

3. **Verification**: Always verify data integrity after restore

### Migration Scenarios

For moving data between environments:

1. **Source environment**:
   ```bash
   dockform volume snapshot production_data -o /shared/backups/
   ```

2. **Target environment**:
   ```bash
   # Ensure volume exists
   dockform apply

   # Restore data
   dockform volume restore production_data /shared/backups/production_data/snapshot.tar.zst --force
   ```

## Troubleshooting

### Common Issues

**"Volume not found in Docker context"**
- Ensure the volume exists: `docker volume ls`
- Run `dockform apply` to create missing volumes

**"Volume not defined in manifest"**
- Add the volume to your `dockform.yaml` file
- Volumes must be explicitly declared to be restored

**"Checksum mismatch"**
- Snapshot file may be corrupted
- Try using a different snapshot or re-create from source

**"Containers are using volume"**
- Use `--stop-containers` flag
- Or manually stop containers: `docker compose stop`

### Performance Considerations

- **Compression**: zstd provides excellent compression ratios with fast decompression
- **Network storage**: Consider network latency when storing snapshots remotely
- **Large volumes**: Monitor disk space during snapshot creation and restore

## Technical Implementation

### Snapshot Process

1. **Volume inspection**: Retrieves volume metadata (driver, options, labels)
2. **Spec hash calculation**: Creates deterministic hash from volume configuration
3. **Data extraction**: Uses helper container to create tar archive with proper permissions
4. **Compression**: Applies zstd compression for optimal storage efficiency
5. **Integrity calculation**: Computes SHA-256 checksum and file statistics
6. **Metadata generation**: Creates JSON sidecar with all relevant information

### Restore Process

1. **Validation**: Checks manifest, volume existence, and snapshot integrity
2. **Container detection**: Identifies containers using the target volume
3. **Safety checks**: Validates non-empty volume and container state
4. **Container management**: Stops containers if requested
5. **Data restoration**: Extracts archive to volume using helper container
6. **Recovery**: Restarts previously running containers

The implementation uses Alpine Linux helper containers to ensure consistent behavior across different Docker environments and properly handle file permissions, extended attributes, and ACLs when supported.


