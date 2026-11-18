## Context

The existing implementation produces `.floorplan-directory/index.html` and a separate server per map. Opening the current port therefore shows one map, and browser actions can only address that map's API. The launcher requires a server rooted at the configured parent directory and a route namespace for each registered map.

## Goals / Non-Goals

**Goals:**

- Show a launcher with no diagram at `/`.
- Browse projects through a hamburger tree and configure the root folder from the UI.
- Open registered maps at stable internal paths and control whether each map server runs.

**Non-Goals:**

- Change project source or map data when the configured root changes.
- Support remote hosting; this server remains loopback-only.
- Merge multiple project graphs into one diagram.

## Decisions

### Add a dedicated directory server

`directory-server.mjs` owns one local port, the configured root, the launcher UI, internal map routes, and process lifecycle operations. The generator remains usable independently and provides a static fallback.

### Persist the root beside the launcher

The selected absolute root is stored in `.floorplan-directory/settings.json`. The launcher accepts a folder path, validates it, rediscovers maps, and atomically updates the index. The browser never sends arbitrary commands; server actions accept only registered map IDs.

### Proxy running maps below their internal route

For server mode, the launcher starts or reuses the registered map's existing `serve.mjs` and reverse proxies `/map/<id>/...` to that loopback server. This preserves the mature map API and CSP without changing project map files. Static mode serves the registered `index.html` under `/map/<id>/static/`.

### Keep root as navigation

The launcher template renders the branded welcome/empty state, hamburger, folder tree, settings view, and recent selection. It does not embed or initialize any map graph until navigation enters a map route.

## Risks / Trade-offs

- [Configured folder is moved or unreadable] → Keep the last valid index and show a clear settings error.
- [Map server fails to start] → Keep static mode available and show a retryable error.
- [Internal proxy mishandles streaming endpoints] → Preserve response headers and stream bytes for SSE and normal responses; test live reload and API paths.

## Migration Plan

1. Add launcher template/server and settings persistence.
2. Add internal map route proxying and server controls.
3. Update directory command to start/open the launcher and document migration from the static HTML.
4. Existing maps stay valid; rerunning the directory command refreshes the registry.

## Open Questions

- None. The user confirmed `/` is the launcher and diagrams use internal routes.
