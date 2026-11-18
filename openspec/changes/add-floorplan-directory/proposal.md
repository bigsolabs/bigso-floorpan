## Why

Floorplan produces useful maps per project, but people who keep several projects under one folder have no way to see which maps already exist or open them from one place. A directory view turns those independent maps into a navigable local catalogue without re-scanning their source code.

## What Changes

- Add a `directory.mjs` command that accepts a folder root and discovers valid descendant Floorplan maps.
- Generate a local, self-contained directory page with a path tree and one card per discovered map.
- Let users open an existing map from its directory card without modifying that map or its source project.
- Add automated coverage for valid maps, non-map folders named `floorplan`, ignored directories, nested maps, and custom output locations.

## Capabilities

### New Capabilities

- `floorplan-directory`: Discover and browse existing Floorplan maps beneath a configured folder.

### Modified Capabilities

- None.

## Impact

- New standalone script and HTML asset under `skills/floorplan/`.
- New regression tests and documentation for the command.
- No runtime dependencies, network requests, or changes to existing map generation.
