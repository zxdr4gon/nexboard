# Whiteboard — Phase 1 (Foundation / Canvas Engine)

A client-side, GitHub Pages-deployable infinite whiteboard. This is
**Phase 1 of 5** from the master architecture spec: the canvas engine,
camera, theme system, document model skeleton, and a working Pen tool.
Nothing later than Phase 1 (shapes, selection, text, images,
persistence, export) is implemented yet.

## What's here

- Vite + TypeScript, strict mode, no UI framework (per spec: the canvas
  engine stays imperative and independent of any framework's render
  cycle).
- `Camera` / `CoordinateSystem` — world↔screen conversion, pan, zoom,
  zoom-to-cursor. Covered by unit tests in `tests/unit/`.
- Adaptive dot grid that keeps a comfortable on-screen spacing at any
  zoom level.
- `WhiteboardDocument` — an in-memory, JSON-serializable project
  (`format: "whiteboard-project"`), holding one default layer.
- `PenTool` — streamline-smoothed freehand strokes, stored as vector
  point data (not raster), rendered with quadratic-midpoint smoothing.
- `ThemeManager` with semantic colors: ink drawn in light mode resolves
  to a legible color in dark mode and vice versa, while a future
  literal/adaptive-literal color would stay fixed (the resolver
  supports this; nothing currently creates literal colors, since Phase
  1 has no color picker yet).

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build to dist/
npm run preview   # serve the production build locally
npm run test      # vitest unit tests
npm run package   # build + zip the repo into release/whiteboard-app.zip (requires `zip`)
```

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Enable Pages under Settings → Pages → Source: GitHub Actions.
3. Push to `main` (or run the workflow manually) — `.github/workflows/deploy-pages.yml`
   builds and deploys `dist/` automatically.
4. `vite.config.ts` uses `base: './'` (relative), so it works at any
   `https://<user>.github.io/<repo>/` path without editing the config.

## Manual QA checklist (Phase 1 acceptance criteria)

- [ ] Freehand drawing feels smooth, not jittery or laggy.
- [ ] Panning (Hand tool, and plain wheel/trackpad scroll) feels like
      moving over an infinite surface.
- [ ] Ctrl+wheel (or pinch on a trackpad) zooms toward/away from the
      cursor, not the viewport center.
- [ ] The dot grid stays visually consistent — not too dense, not
      empty — from very zoomed-in to very zoomed-out.
- [ ] The coordinate readout in the bottom-left HUD updates correctly
      while moving the pointer; the zoom % updates on zoom.
- [ ] The theme button toggles light/dark and ink strokes stay legible
      in both.
- [ ] Resizing the window doesn't distort or blank the canvas.

## Known limitations (by design, deferred to later phases)

- Only the Pen tool and Hand tool exist. No shapes, select, text,
  image, eraser, marker, or highlighter yet (Phase 2/3).
- `WhiteboardDocument.addObject()` mutates directly — no undo/redo yet.
  Phase 2 introduces a `CommandManager` and routes mutation through it.
- Nothing persists. Closing the tab loses the board. IndexedDB
  autosave/recovery is Phase 3.
- No JSON import, only `App.exportProjectJson()` for debugging via the
  console — file-based import/export is Phase 3.
- No spatial index / object culling — fine at Phase 1 object counts,
  will matter once Phase 4's performance work is relevant.
- `Camera.fitBounds()` is not implemented; it belongs with the "Fit
  Content" export feature in Phase 3.
- `OverlayRenderer` (screen-space canvas overlay for selection handles
  etc.) doesn't exist yet — the HUD is plain DOM instead, which is
  sufficient until Phase 2 needs to draw selection UI on the canvas
  itself.

## Next-phase compatibility notes

- `WhiteboardObject` is a union with one member (`StrokeObject`).
  Phase 2's shapes extend the union; `ObjectRenderer.render()` already
  switches on `object.type`, so new cases slot in without touching
  existing ones.
- `ToolManager`/`Tool` already support registering arbitrary tools;
  Phase 2 tools (Select, Rectangle, etc.) implement the same interface.
- `WhiteboardProject` matches the spec's serialized shape, so Phase 3's
  IndexedDB persistence and JSON import/export can read/write it
  without a schema migration for anything built in Phase 1.
