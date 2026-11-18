## Context

The launcher is a local HTTP app whose server scans one configured root into a generated registry. Existing settings contain `{ root }`. The browser cannot provide an absolute local path through a normal web folder input, so folder selection must be delegated to the local launcher process.

## Goals / Non-Goals

- Keep multiple workspace roots and an active workspace in the launcher's settings file.
- Add and switch workspaces without restarting the launcher; rescan on selection or root change.
- Use a fixed, shell-free native folder-picker invocation on macOS, where the launcher runs; keep manual path entry available on other platforms or when the picker is unavailable.
- Preserve current visual language, theme support, and map/server behavior.
- Do not add removal, cloud sync, or workspace-specific server configuration in this change.

## Decisions

- Settings become `{ workspaces: [{ id, name, root }], activeWorkspaceId, updatedAt }`. A legacy `{ root }` is migrated to one workspace on startup. IDs are deterministic from canonical paths so rescans preserve identity.
- `GET /api/directory` includes the active workspace and workspace list. A protected `POST /api/workspaces` supports `add` and `select`; existing `POST /api/settings` updates the selected workspace's name/root.
- `POST /api/browse` opens the operating-system folder chooser using a fixed AppleScript passed as arguments to `osascript` without a shell. Cancellation is a normal result. Unsupported platforms return a clear error, leaving the path field usable.
- Workspace selection rescans that root and regenerates the active directory index in the launcher's output directory. Map server controls continue to operate only on maps in the active registry.
- The header gains a compact workspace selector and add action. The existing settings drawer edits the current workspace or creates a new one and offers “Browse…” beside the path field.

## Risks / Trade-offs

- The native picker is macOS-specific in this iteration; manual absolute-path entry remains available elsewhere.
- The generated index is for the active workspace only; the persisted workspace list is independent of generated map metadata.
- If a configured folder disappears, selecting it reports a validation error and leaves the prior active workspace intact.

## Migration Plan

On startup, convert legacy `{ root }` settings to the new workspace list, write the migrated settings, and scan the active workspace. No user action is required.

## Open Questions

- None.
