## Context

The directory generator already writes a safe local index, but its custom page is visually disconnected from the Floorplan viewer. `serve.mjs` already owns a map's local process lifecycle and securely gates browser APIs with an origin-bound token; it is the right boundary for server control.

## Goals / Non-Goals

**Goals:**

- Add directory navigation as an extension of the viewer header, anchored at the logo.
- Allow a user to choose static or locally served opening for registered maps.
- Reuse the existing local token/origin API boundary and theme variables.

**Non-Goals:**

- Expose arbitrary filesystem paths or commands to the viewer.
- Proxy child map files through a central server.
- Alter maps not listed in the directory index.

## Decisions

### Discover the nearest directory index in `serve.mjs`

The server walks ancestors of its map root for `.floorplan-directory/directory.json`, validates that its own map is registered, and passes only a boolean to the page. This lets any selected served map display the same picker without embedding absolute paths into maps.

### Keep the index authoritative for actions

The server re-reads the local index for each directory API action. IDs map to resolved `floorplan` directories and operations are restricted to those directories. A browser never supplies a filesystem path.

### Add a numbered viewer extension

`15-directory.js` follows the existing UI-extension pattern. It creates a themed, keyboard-accessible floating menu positioned under the logo, requests data from the local server, and uses the viewer's safe `openWindow` helper.

### Reuse `serve.mjs` lifecycle semantics

Starting a child map launches its generated `serve.mjs` with `--no-open` and waits for its own `.cache/server.json`; stopping validates the recorded process and sends it a termination signal. The static option points directly to the registered map's `index.html` URL.

## Risks / Trade-offs

- [The directory index is stale] → Status is recalculated from current map state and the picker explains that refreshing the directory discovers additions and removals.
- [A server fails to launch] → Return a safe generic error and retain the static option.
- [A deeply nested map has unrelated parent indexes] → Use the nearest index that explicitly registers the current map.

## Migration Plan

1. Extend directory entries with stable IDs and map-relative paths.
2. Add server-side trusted index lookup and lifecycle API.
3. Add the themed viewer extension and tests.
4. Keep the current directory HTML as an offline fallback.

## Open Questions

- None for this increment.
