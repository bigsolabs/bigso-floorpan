## Why

Users can add and switch workspaces but cannot remove an obsolete entry from the launcher, leaving manual settings-file editing as the only cleanup path. The directory tree also communicates hierarchy and selection too weakly for a launcher used to browse many projects.

## What Changes

- Add a safe remove-workspace action that removes only the launcher entry, never files in the configured folder.
- Prevent removal of the last workspace and select a remaining workspace if the active one is removed.
- Improve directory tree hierarchy, affordances, active states, and folder expand/collapse behavior while retaining existing themes.

## Capabilities

### New Capabilities
- `workspace-management`: Remove saved workspaces safely and preserve a valid active workspace.

### Modified Capabilities
- None.

## Impact

- Workspace API and settings persistence in `skills/floorplan/scripts/directory-server.mjs`.
- Workspace settings drawer and directory tree in `skills/floorplan/assets/directory.html`.
- Integration/UI tests and OpenSpec artifacts.
