## Why

The current directory is a static catalogue and each map server still opens a diagram as the home screen. The desired experience is a single Floorplan launcher where the root shows navigation and setup, while diagrams appear only after a project is selected.

## What Changes

- **BREAKING** Make the directory server the single local entry point: `/` is a launcher and `/map/<id>` opens a selected map.
- Add a hamburger navigation panel with a hierarchical project tree and server status/actions.
- Add settings to configure and rescan the parent folder.
- Serve selected project maps under internal routes, using their local server when requested or static HTML when not.
- Keep project map files unchanged when configuring the launcher.

## Capabilities

### New Capabilities

- `directory-launcher`: Configure a folder of maps, browse them from a launcher root, and open individual diagrams through internal routes.

### Modified Capabilities

- `floorplan-directory`: Generated directory metadata becomes the launcher server's registry and configuration seed.

## Impact

- Directory scripts and templates, generated map server routing, viewer map API paths, tests, docs, and OpenSpec artifacts.
- No new dependencies or remote services.
