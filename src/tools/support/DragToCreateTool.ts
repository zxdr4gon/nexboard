// Shared drag-anchor-to-current-point interaction for Rectangle/Ellipse/
// Triangle/Line/Arrow (spec section 38: dynamic snap preview lives in
// the interaction layer, not the document, until pointer release).
import { AddObjectsCommand } from '../../commands/AddObjectsCommand';
import type { NormalizedPointerEvent } from '../../input/NormalizedEvents';
import type { Point } from '../../model/geometry';
import type { WhiteboardObject } from '../../model/types';
import { snapPointToGrid } from '../../selection/SnapManager';
import type { Tool, ToolContext, ToolId, ToolPreview } from '../Tool';

export abstract class DragToCreateTool implements Tool {
  abstract readonly id: ToolId;

  protected anchor: Point | null = null;
  protected current: Point | null = null;
  protected shiftKey = false;
  protected altKey = false;

  protected abstract buildObject(
    anchor: Point,
    current: Point,
    shiftKey: boolean,
    altKey: boolean,
    layerId: string,
  ): WhiteboardObject | null;

  protected abstract label(): string;

  protected minDragWorld(): number {
    return 3;
  }

  private snap(ctx: ToolContext, point: Point): Point {
    return ctx.snapSettings.grid ? snapPointToGrid(point, ctx.document.getSettings().grid.baseSpacing) : point;
  }

  pointerDown(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (e.buttons !== 1) return;
    this.anchor = this.snap(ctx, { x: e.worldX, y: e.worldY });
    this.current = this.anchor;
    this.shiftKey = e.shiftKey;
    this.altKey = e.altKey;
    ctx.requestRender();
  }

  pointerMove(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (!this.anchor) return;
    this.current = this.snap(ctx, { x: e.worldX, y: e.worldY });
    this.shiftKey = e.shiftKey;
    this.altKey = e.altKey;
    ctx.requestRender();
  }

  pointerUp(ctx: ToolContext): void {
    if (this.anchor && this.current) {
      const dragDistance = Math.hypot(this.current.x - this.anchor.x, this.current.y - this.anchor.y);
      if (dragDistance >= this.minDragWorld()) {
        const object = this.buildObject(this.anchor, this.current, this.shiftKey, this.altKey, ctx.document.defaultLayerId);
        if (object) ctx.commands.execute(new AddObjectsCommand(ctx.document, [object], this.label()));
      }
    }
    this.reset();
    ctx.requestRender();
  }

  cancel(): void {
    this.reset();
  }

  getPreview(): ToolPreview | null {
    if (!this.anchor || !this.current) return null;
    const object = this.buildObject(this.anchor, this.current, this.shiftKey, this.altKey, 'preview');
    return object ? { kind: 'object', object } : null;
  }

  /** Shared square/circle (Shift) + from-center (Alt) box math for Rectangle/Ellipse/Triangle (spec section 150). */
  protected computeBoxFromDrag(
    anchor: Point,
    current: Point,
    square: boolean,
    fromCenter: boolean,
  ): { cx: number; cy: number; halfW: number; halfH: number } {
    let dx = current.x - anchor.x;
    let dy = current.y - anchor.y;
    if (square) {
      const s = Math.max(Math.abs(dx), Math.abs(dy));
      dx = (dx < 0 ? -1 : 1) * s;
      dy = (dy < 0 ? -1 : 1) * s;
    }
    if (fromCenter) {
      return { cx: anchor.x, cy: anchor.y, halfW: Math.abs(dx), halfH: Math.abs(dy) };
    }
    return { cx: anchor.x + dx / 2, cy: anchor.y + dy / 2, halfW: Math.abs(dx) / 2, halfH: Math.abs(dy) / 2 };
  }

  private reset(): void {
    this.anchor = null;
    this.current = null;
    this.shiftKey = false;
    this.altKey = false;
  }
}
