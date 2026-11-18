## Why

The first directory is a separate page, so it feels detached from Floorplan and cannot give a selected map the local server capabilities users expect. The catalogue needs to become part of the existing map chrome and let a person choose whether a map opens with its local server or as its static HTML.

## What Changes

- Replace the standalone directory page with a directory index consumed by the existing Floorplan map viewer.
- Add a floating map-picker menu activated from the Floorplan logo in the viewer header.
- Show discovered maps in their folder tree and allow each map to open as static HTML or through its existing local server.
- Add controlled server start/stop operations for registered discovered maps, without exposing arbitrary filesystem paths to the browser.

## Capabilities

### New Capabilities

- `integrated-map-directory`: Browse and open a configured folder's existing maps from the Floorplan viewer.

### Modified Capabilities

- `floorplan-directory`: Directory output now supplies an integrated map-picker instead of a standalone visual page.

## Impact

- Directory generator, generated index, map server, viewer extension, tests, and skill documentation.
- No third-party dependencies or network access.
