## Why

The launcher currently remembers only one parent folder, so switching between codebases requires replacing its configuration each time. Managing several workspaces and selecting their folders visually makes the launcher useful as a persistent directory.

## What Changes

- Persist multiple named workspace roots and let the user switch the active workspace from the launcher.
- Allow adding or editing a workspace with a native folder picker, while retaining an editable path field as a fallback.
- Keep the current workspace's project tree and server controls scoped to that workspace.
- Migrate existing single-root settings without losing the configured folder.

## Capabilities

### New Capabilities
- `workspaces`: Configure, select, and scan multiple workspace roots in the launcher.

### Modified Capabilities
- None.

## Impact

- Launcher UI in `skills/floorplan/assets/directory.html`.
- Local launcher API and persisted settings in `skills/floorplan/scripts/directory-server.mjs`.
- Directory integration tests and supply-chain allowlist for the fixed native folder-picker command.
