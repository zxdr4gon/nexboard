// Spec section 46: "For a simple implementation, select objects whose
// AABB center lies inside the lasso" — the option the spec explicitly
// sanctions, rather than full polygon/shape intersection.
import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { Point } from '../model/geometry';
import { boundsCenter, pointInPolygon } from '../model/geometry';
import { getObjectBounds } from '../selection/ObjectGeometry';
import type { Tool, ToolContext, ToolPreview } from './Tool';

export class LassoTool implements Tool {
  readonly id = 'lasso' as const;

  private points: Point[] = [];
  private active = false;

  pointerDown(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (e.buttons !== 1) return;
    this.active = true;
    this.points = [{ x: e.worldX, y: e.worldY }];
    if (!e.shiftKey) ctx.selection.clear();
    ctx.requestRender();
  }

  pointerMove(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (!this.active) return;
    this.points.push({ x: e.worldX, y: e.worldY });
    ctx.requestRender();
  }

  pointerUp(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (!this.active) return;
    this.active = false;
    if (this.points.length >= 3) {
      const ids = ctx.document
        .getRenderOrder()
        .filter((o) => o.visible && !o.locked)
        .filter((o) => pointInPolygon(boundsCenter(getObjectBounds(o)), this.points))
        .map((o) => (o.parentId ? (ctx.document.getObject(o.parentId)?.id ?? o.id) : o.id));
      const unique = [...new Set(ids)];
      if (unique.length > 0) {
        if (e.shiftKey) unique.forEach((id) => ctx.selection.add(id));
        else ctx.selection.set(unique);
      }
    }
    this.points = [];
    ctx.requestRender();
  }

  cancel(): void {
    this.active = false;
    this.points = [];
  }

  getPreview(): ToolPreview | null {
    if (this.points.length < 2) return null;
    return { kind: 'stroke', points: this.points, width: 1.5 };
  }
}
