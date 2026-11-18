## Context

Current Floorplan scripts treat one folder as one map root. `scan.mjs` can include several Git repositories in that map, but it intentionally excludes generated `floorplan` directories. A directory needs the inverse operation: find existing maps without reading their code.

## Goals / Non-Goals

**Goals:**

- Provide a deterministic local catalogue from a folder path.
- Preserve existing project maps and avoid dependencies or network access.
- Keep generated files out of Git by default.

**Non-Goals:**

- Combine maps or infer dependencies between projects.
- Start, proxy, or alter child map servers; child maps open as their existing local HTML pages.
- Persist a global registry outside the configured root.

## Decisions

### Use `graph.json` as the map contract

The discovery process identifies a map only when `floorplan/graph.json` parses and exposes map metadata. This distinguishes generated maps from unrelated folders named `floorplan` and avoids source scans. Checking only a folder name was rejected because it creates false positives.

### Write to a hidden root-local directory by default

Default output is `<root>/.floorplan-directory`, with `--out` for a caller-controlled location. The hidden default avoids being interpreted as source by existing scanners; a `.gitignore` makes its generated nature explicit. A global user cache was rejected because it makes a directory harder to move or share locally.

### Generate one static page

`directory.mjs` writes `directory.json` and a self-contained `index.html` copied from an asset template. The page uses escaped JSON and DOM text nodes, then links to maps with relative paths. This requires no server and preserves Floorplan's offline/no-dependencies constraint.

### Traverse independently from Git repository discovery

Directory discovery walks folders even when a Git repository boundary is encountered. It skips symlinks, hidden folders, and known generated/dependency folders, with a bounded depth. Reusing `discover()` was rejected because that function stops at Git repositories and would miss maps within them.

## Risks / Trade-offs

- [A map was moved after the directory was built] → Its card can fail until the user refreshes the directory; relative paths avoid stale absolute paths.
- [An invalid or hostile graph file] → Cap input size, validate the small metadata shape, encode JSON safely, and render untrusted fields with `textContent`.
- [A map opened directly has no local Ask server] → The map remains browseable; users can open its project map normally when they need Ask.

## Migration Plan

1. Add the standalone command and its asset.
2. Add tests for discovery, safety boundaries, output, and linking.
3. Document the command and add it to the Floorplan skill workflow as an optional directory action.
4. Roll back by deleting the new script and asset; generated `.floorplan-directory` folders are independent and removable.

## Open Questions

- A later increment can add a local directory server that opens child maps with their Ask capability, but it is intentionally outside this change.
