# Whiteboard — Phase 2 (Object Model / Shapes / Selection)

A client-side, GitHub Pages-deployable infinite whiteboard. This is
**Phase 2 of 5** from the master architecture spec, built on top of
Phase 1's canvas/camera/theme engine. Phase 2 adds shapes, hold-to-snap
shape recognition, selection with transform handles, grouping, z-order,
snapping, and undo/redo. Nothing from Phase 3 onward (text, images,
persistence, export) is implemented yet.

## What's new in Phase 2

- **Shape objects & tools**: Rectangle, Ellipse, Triangle, Line, Arrow
  (drag-to-create; Shift constrains to square/circle/15°, Alt draws
  from center) and Polygon (click to place vertices; finish with
  double-click, clicking the first vertex, or Enter; Escape cancels).
- **Hold-to-snap shape recognition**: draw with the Pen tool, pause
  briefly (~260ms) without lifting, and if the stroke-so-far resembles
  a line/rectangle/ellipse/triangle it snaps to the canonical shape
  live, before you even release the pointer.
- **Select tool**: click to select, Shift-click to add/toggle, drag an
  empty area for marquee (rectangle) selection, drag a selected object
  to move it. Resize via 8 handles, rotate via the handle above the
  selection. Shift on a corner handle resizes proportionally; Alt
  resizes from center.
- **Lasso tool**: freeform selection — objects whose center falls
  inside the loop are selected (see Known limitations).
- **Grouping**: Ctrl/Cmd+G groups the current multi-selection;
  Ctrl/Cmd+Shift+G ungroups. A group moves/resizes/rotates as one unit.
- **Z-order**: Ctrl/Cmd+] / [ (forward/backward), Ctrl/Cmd+Shift+] / [
  (front/back) — single-selection only, see below.
- **Snapping**: a toolbar toggle turns on grid snapping for
  shape-drawing and moving; object alignment guides (edges/centers)
  appear and snap automatically when grid snap is off, both with
  visible on-canvas feedback (dashed guide lines, snapping dot grid).
- **Undo/redo**: Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z (or Ctrl/Cmd+Y), with
  toolbar buttons that disable when the relevant stack is empty. Every
  create, delete, move, resize, rotate, group, ungroup, and reorder is
  one undo step, regardless of how many pointermove events it took.

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build to dist/
npm run preview   # serve the production build locally
npm run test      # vitest unit tests (17, covering camera math, object
                   # transforms, shape recognition, undo/redo)
npm run package   # build + zip the repo into release/whiteboard-app.zip
```

## Deploying to GitHub Pages

Unchanged from Phase 1 — push to `main`, enable Pages with source
"GitHub Actions", and `.github/workflows/deploy-pages.yml` builds,
tests, and deploys `dist/` automatically. The workflow now also runs
`npm run test` before building, so a broken commit won't deploy.

## Manual QA checklist (Phase 2 acceptance criteria)

- [ ] **Shapes are editable after creation**: select any shape, drag a
      resize handle, drag the rotate handle, drag the shape itself —
      all three should work on the same object without re-selecting.
- [ ] **Undo/redo works across major operations**: draw a shape, move
      it, resize it, delete it — four Ctrl+Z presses should reverse
      all four, in order, and Ctrl+Shift+Z should redo them.
- [ ] **Selection handles work**: a single selected shape shows 8
      resize handles + 1 rotate handle; dragging each behaves as
      expected; multi-select shows one combined bounding box.
- [ ] **Snapping is visually clear**: with grid snap on, dragging a
      shape visibly jumps between grid points; with it off, dragging a
      shape near another one shows a dashed alignment guide and snaps
      to it.
- [ ] Hold-to-snap: draw a rough circle or rectangle with the Pen tool
      and pause before releasing — it should snap to a clean shape.
- [ ] Group two shapes (Ctrl+G), move the group, ungroup it
      (Ctrl+Shift+G) — both members should have moved together and
      remain independently selectable afterward.
- [ ] Marquee-select several objects and delete them in one Delete
      press; one Ctrl+Z should bring all of them back.

## Known limitations (by design, deferred to later phases)

- **Single-level grouping only.** A group can't contain another group
  (Ctrl+G is a no-op if any selected object is already a group). The
  spec allows skipping nested groups "if implementation complexity
  remains manageable" — this is that call.
- **Resize handles use the selection's axis-aligned bounding box**,
  never an oriented one. For an unrotated object this is exact. For a
  single object that's already rotated, the handle box sits on its
  AABB rather than its true rotated corners, so a resize drag maps
  world axes onto the object's local width/height directly — it still
  works and never shears the shape, but won't feel perfectly aligned
  with the object's own edges until it's rotated back near 0°. True
  oriented-bounding-box resize is deferred.
- **Multi-select z-order isn't supported** — Ctrl+]/[ only act when
  exactly one object (or group) is selected.
- **Shape recognition simplifications**: recognized rectangles are
  always axis-aligned (a rotated hand-drawn rectangle won't be
  normalized to a rotated one), and recognized triangles are always
  canonicalized to an upright isosceles triangle matching the
  gesture's bounding box rather than fit to its actual vertices.
- **Lasso selects by object center**, not true polygon intersection —
  this is the simplified approach the spec itself sanctions as
  acceptable.
- **No fill/stroke color picker UI.** Every new shape uses the default
  stroke style (ink-primary, width 2) with no fill; per-object style
  editing arrives with the Inspector panel in a later phase.
- **No duplicate (Ctrl+D).** Deferred rather than half-implemented
  inconsistently for groups — see the commit history if you want to
  add plain-object duplication before group-aware duplication lands.
- **No layer-management UI.** The document model already supports
  multiple layers and z-order operates correctly against layer
  structure, but there's still only ever one layer and no panel to
  add/reorder layers — that's Phase 4 "Advanced UX" territory.
- **PolygonTool's double-click detection is timing-based** (two
  pointerdowns within ~320ms), not the native `dblclick` event, since
  the app only wires pointer events. Clicking the first vertex or
  pressing Enter are the reliable ways to finish a polygon.
- Everything Phase 1's README already listed (no persistence, no
  IndexedDB, no export, no spatial index) still applies.

## Next-phase compatibility notes

- `WhiteboardObject` is now an 8-member union
  (stroke/rectangle/ellipse/triangle/line/arrow/polygon/group).
  `ObjectRenderer`, `ObjectGeometry`, and `HitTesting` all switch on
  `type`, so Phase 3's text/image objects are two more cases each, not
  a redesign.
- `Document.groupObjects`/`ungroupObjects` already reshuffle
  `layer.objectIds` correctly for a future multi-layer UI — moving an
  object between layers just needs a new Document method, not a
  rewrite of z-order/grouping.
- Every mutation Phase 3 will want to persist (IndexedDB autosave,
  JSON export) already flows through `Document`, which stays a plain
  serializable `WhiteboardProject` — nothing added in Phase 2 broke
  that.
- The `Command`/`CommandManager` pair is deliberately generic — Phase
  3's asset/image commands and Phase 4's alignment/distribute commands
  are new `Command` implementations, not changes to the manager.
