// Spec section 40 (select tool). Move/resize/rotate all mutate the
// document DIRECTLY on every pointermove for immediate visual feedback,
// then collapse into a single TransformObjectsCommand on pointerup —
// this is what spec section 59 means by "one completed... transform can
// be one history item," not a history entry per pointermove.
import { DeleteObjectsCommand } from '../commands/DeleteObjectsCommand';
import { TransformObjectsCommand, type TransformEntry } from '../commands/TransformObjectsCommand';
import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { Bounds, Point } from '../model/geometry';
import { boundsIntersect } from '../model/geometry';
import type { WhiteboardObject } from '../model/types';
import { findTopmostObjectAt } from '../selection/HitTesting';
import { HANDLE_SIGNS, computeHandles, hitTestHandle, type HandleInfo, type HandleType } from '../selection/Handles';
import { getObjectBounds, getUnionBounds, resolveToLeafObjects, rotateObjectAroundPivot, scaleObjectAroundPivot, translateObject } from '../selection/ObjectGeometry';
import { computeAlignmentSnap, snapPointToGrid, type AlignmentGuide } from '../selection/SnapManager';
import type { Tool, ToolContext } from './Tool';

type Mode = 'idle' | 'move' | 'resize' | 'rotate' | 'marquee';

export interface SelectionOverlayState {
  worldBounds: Bounds | null;
  handles: HandleInfo[];
  marqueeWorld: Bounds | null;
  guides: AlignmentGuide[];
}

export class SelectTool implements Tool {
  readonly id = 'select' as const;

  private mode: Mode = 'idle';
  private dragStartWorld: Point | null = null;
  private snapshots = new Map<string, WhiteboardObject>();
  private activeHandle: HandleType | null = null;
  private boundsAtStart: Bounds | null = null;
  private pivot: Point | null = null;
  private startAngle = 0;
  private marqueeRect: Bounds | null = null;
  private guides: AlignmentGuide[] = [];
  private dirty = false;

  pointerDown(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (e.buttons !== 1) return;
    const worldPoint = { x: e.worldX, y: e.worldY };
    const screenPoint = { x: e.screenX, y: e.screenY };
    const selected = ctx.selection.getObjects(ctx.document);

    if (selected.length > 0) {
      const resolved = resolveToLeafObjects(ctx.document, selected);
      const bounds = getUnionBounds(resolved);
      if (bounds) {
        const handles = computeHandles(bounds, ctx.camera, ctx.getViewport());
        const hit = hitTestHandle(handles, screenPoint);
        if (hit) {
          this.beginHandleGesture(hit.type, bounds, resolved, worldPoint);
          return;
        }
      }
    }

    const hitObject = findTopmostObjectAt(ctx.document, worldPoint, ctx.camera.state.zoom);
    if (hitObject) {
      if (e.shiftKey) {
        ctx.selection.toggle(hitObject.id);
      } else if (!ctx.selection.isSelected(hitObject.id)) {
        ctx.selection.set([hitObject.id]);
      }
      if (ctx.selection.isSelected(hitObject.id)) {
        this.beginMove(resolveToLeafObjects(ctx.document, ctx.selection.getObjects(ctx.document)), worldPoint);
      }
    } else {
      if (!e.shiftKey) ctx.selection.clear();
      this.mode = 'marquee';
      this.dragStartWorld = worldPoint;
      this.marqueeRect = { minX: worldPoint.x, minY: worldPoint.y, maxX: worldPoint.x, maxY: worldPoint.y };
    }
    ctx.requestRender();
  }

  pointerMove(ctx: ToolContext, e: NormalizedPointerEvent): void {
    const worldPoint = { x: e.worldX, y: e.worldY };

    if (this.mode === 'marquee' && this.dragStartWorld) {
      this.marqueeRect = {
        minX: Math.min(this.dragStartWorld.x, worldPoint.x),
        minY: Math.min(this.dragStartWorld.y, worldPoint.y),
        maxX: Math.max(this.dragStartWorld.x, worldPoint.x),
        maxY: Math.max(this.dragStartWorld.y, worldPoint.y),
      };
      ctx.requestRender();
      return;
    }

    if (this.mode === 'move' && this.dragStartWorld) {
      this.applyMove(ctx, worldPoint);
      ctx.requestRender();
      return;
    }

    if (this.mode === 'resize' && this.boundsAtStart && this.activeHandle) {
      this.applyResize(ctx, worldPoint, e.shiftKey, e.altKey);
      ctx.requestRender();
      return;
    }

    if (this.mode === 'rotate' && this.pivot) {
      this.applyRotate(ctx, worldPoint);
      ctx.requestRender();
    }
  }

  pointerUp(ctx: ToolContext): void {
    if (this.mode === 'marquee') {
      this.finishMarquee(ctx);
    } else if (this.dirty) {
      this.commitTransform(ctx);
    }
    this.resetGesture();
  }

  cancel(): void {
    this.resetGesture();
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if ((e.key === 'Delete' || e.key === 'Backspace') && !ctx.selection.isEmpty()) {
      e.preventDefault();
      this.deleteSelection(ctx);
    } else if (e.key === 'Escape') {
      ctx.selection.clear();
      ctx.requestRender();
    }
  }

  getOverlay(ctx: ToolContext): SelectionOverlayState {
    const selected = resolveToLeafObjects(ctx.document, ctx.selection.getObjects(ctx.document));
    const worldBounds = getUnionBounds(selected);
    const handles = worldBounds ? computeHandles(worldBounds, ctx.camera, ctx.getViewport()) : [];
    return { worldBounds, handles, marqueeWorld: this.marqueeRect, guides: this.guides };
  }

  // --- gesture setup -------------------------------------------------

  private beginMove(objects: WhiteboardObject[], worldPoint: Point): void {
    this.mode = 'move';
    this.dragStartWorld = worldPoint;
    this.snapshots = new Map(objects.map((o) => [o.id, structuredClone(o)]));
    this.dirty = false;
  }

  private beginHandleGesture(handleType: HandleType, bounds: Bounds, objects: WhiteboardObject[], worldPoint: Point): void {
    this.snapshots = new Map(objects.map((o) => [o.id, structuredClone(o)]));
    this.boundsAtStart = bounds;
    this.dirty = false;
    if (handleType === 'rotate') {
      this.mode = 'rotate';
      const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
      this.pivot = center;
      this.startAngle = Math.atan2(worldPoint.y - center.y, worldPoint.x - center.x);
    } else {
      this.mode = 'resize';
      this.activeHandle = handleType;
    }
  }

  // --- gesture application --------------------------------------------

  private applyMove(ctx: ToolContext, worldPoint: Point): void {
    let dx = worldPoint.x - this.dragStartWorld!.x;
    let dy = worldPoint.y - this.dragStartWorld!.y;
    this.guides = [];

    const originals = [...this.snapshots.values()];
    const movingBoundsRaw = getUnionBounds(originals.map((o) => translateObject(o, dx, dy)));

    if (ctx.snapSettings.grid && movingBoundsRaw) {
      const spacing = ctx.document.getSettings().grid.baseSpacing;
      const topLeft = { x: movingBoundsRaw.minX, y: movingBoundsRaw.minY };
      const snappedTopLeft = snapPointToGrid(topLeft, spacing);
      dx += snappedTopLeft.x - topLeft.x;
      dy += snappedTopLeft.y - topLeft.y;
    } else if (ctx.document.getSettings().snap.object && movingBoundsRaw) {
      const others = ctx.document
        .getRenderOrder()
        .filter((o) => !this.snapshots.has(o.id))
        .map(getObjectBounds);
      const snap = computeAlignmentSnap(movingBoundsRaw, others, 6 / ctx.camera.state.zoom);
      dx += snap.dx;
      dy += snap.dy;
      this.guides = snap.guides;
    }

    if (dx !== 0 || dy !== 0) this.dirty = true;
    for (const [id, original] of this.snapshots) {
      ctx.document.replaceObject(id, translateObject(original, dx, dy));
    }
  }

  private applyResize(ctx: ToolContext, worldPoint: Point, shiftKey: boolean, altKey: boolean): void {
    const bounds = this.boundsAtStart!;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const halfWidth = (bounds.maxX - bounds.minX) / 2;
    const halfHeight = (bounds.maxY - bounds.minY) / 2;
    const sign = HANDLE_SIGNS[this.activeHandle as Exclude<HandleType, 'rotate'>];

    const pivotX = altKey ? centerX : centerX - sign.x * halfWidth;
    const pivotY = altKey ? centerY : centerY - sign.y * halfHeight;

    let scaleX = 1;
    let scaleY = 1;
    if (sign.x !== 0) {
      const rawWidth = altKey ? Math.abs(worldPoint.x - centerX) * 2 : Math.abs(worldPoint.x - pivotX);
      scaleX = Math.max(0.05, rawWidth / Math.max(1, halfWidth * 2));
    }
    if (sign.y !== 0) {
      const rawHeight = altKey ? Math.abs(worldPoint.y - centerY) * 2 : Math.abs(worldPoint.y - pivotY);
      scaleY = Math.max(0.05, rawHeight / Math.max(1, halfHeight * 2));
    }
    if (shiftKey && sign.x !== 0 && sign.y !== 0) {
      // Corner handle + Shift: proportional resize (spec section 44).
      const uniform = Math.max(scaleX, scaleY);
      scaleX = uniform;
      scaleY = uniform;
    }

    this.dirty = true;
    for (const [id, original] of this.snapshots) {
      ctx.document.replaceObject(
        id,
        scaleObjectAroundPivot(original, { x: pivotX, y: pivotY }, sign.x !== 0 ? scaleX : 1, sign.y !== 0 ? scaleY : 1),
      );
    }
  }

  private applyRotate(ctx: ToolContext, worldPoint: Point): void {
    const pivot = this.pivot!;
    const angle = Math.atan2(worldPoint.y - pivot.y, worldPoint.x - pivot.x);
    const delta = angle - this.startAngle;
    if (Math.abs(delta) > 1e-4) this.dirty = true;
    for (const [id, original] of this.snapshots) {
      ctx.document.replaceObject(id, rotateObjectAroundPivot(original, pivot, delta));
    }
  }

  private finishMarquee(ctx: ToolContext): void {
    if (!this.marqueeRect) return;
    const rect = this.marqueeRect;
    const ids = ctx.document
      .getRenderOrder()
      .filter((o) => o.visible && !o.locked && boundsIntersect(getObjectBounds(o), rect))
      .map((o) => (o.parentId ? (ctx.document.getObject(o.parentId)?.id ?? o.id) : o.id));
    const unique = [...new Set(ids)];
    if (unique.length > 0) ctx.selection.set(unique);
    this.marqueeRect = null;
  }

  private commitTransform(ctx: ToolContext): void {
    const entries: TransformEntry[] = [];
    for (const [id, before] of this.snapshots) {
      const after = ctx.document.getObject(id);
      if (after) entries.push({ id, before, after: structuredClone(after) });
    }
    if (entries.length > 0) {
      const label = this.mode === 'rotate' ? 'Rotate' : this.mode === 'resize' ? 'Resize' : 'Move';
      ctx.commands.execute(new TransformObjectsCommand(ctx.document, entries, label));
    }
    this.guides = [];
  }

  private deleteSelection(ctx: ToolContext): void {
    ctx.commands.execute(new DeleteObjectsCommand(ctx.document, ctx.selection.getIds()));
    ctx.selection.clear();
    ctx.requestRender();
  }

  private resetGesture(): void {
    this.mode = 'idle';
    this.dragStartWorld = null;
    this.snapshots = new Map();
    this.activeHandle = null;
    this.boundsAtStart = null;
    this.pivot = null;
    this.marqueeRect = null;
    this.dirty = false;
  }
}
