## Context

Workspace entries live in the launcher's local `settings.json`. The UI currently offers add/edit and switching, but no remove action. The sidebar tree is generated from each map's `projectPath` and renders all directories expanded with minimal visual distinction.

## Goals / Non-Goals

- Remove a workspace from settings without touching its root folder or any project data.
- Keep at least one configured workspace so the launcher always has an active scan root.
- When the active workspace is removed, activate and scan another saved workspace before persisting the change.
- Make folder hierarchy scannable and collapsible with clear selected-map and hover/focus states in both themes.
- Do not add bulk deletion, filesystem deletion, or a separate tree-view framework.

## Decisions

- Extend protected `POST /api/workspaces` with `{ action: 'remove', id }`. Return a validation error if the ID is unknown or is the last workspace. On active removal, scan a remaining workspace, then atomically persist the new list and active ID. Removing an inactive workspace leaves the active registry unchanged.
- Put “Remove workspace” in the workspace sidebar controls and use a browser confirmation naming the workspace. The action only unregisters it from Floorplan.
- Render directory folders as semantic disclosure buttons with `aria-expanded`; collapse only the selected branch and preserve the existing map/home actions.
- Style indentation guides, folder rows, selected map rows, and counts using existing theme variables rather than introducing another palette.

## Risks / Trade-offs

- Keeping at least one workspace means removing the final workspace requires changing its root rather than deleting the last entry.
- Native browser confirmation is simple and consistent, but visually less integrated than a custom confirmation dialog.

## Migration Plan

No settings migration is required. The remove action operates on the current workspace-list format.

## Open Questions

- None.
