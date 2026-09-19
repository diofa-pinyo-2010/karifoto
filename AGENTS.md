# Kötelező Git-szabályok

- A `main` branchre tilos commitolni.
- A `main` branchre tilos pusholni, közvetlenül vagy force push használatával is.
- A módosításokat külön munkabranchen kell elkészíteni; a `main` branchre kizárólag pull requestet (PR-t) szabad létrehozni. A PR-t önállóan nem szabad merge-elni.
- Commit és push előtt mindig ellenőrizni kell az aktuális branchet és a művelet célbranchét.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
