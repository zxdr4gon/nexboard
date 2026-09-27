// Spec section 149: click-by-click vertex placement; finish via double
// click, clicking the first vertex, or Enter; cancel with Escape.
import { AddObjectsCommand } from '../commands/AddObjectsCommand';
import { generateId } from '../document/ObjectId';
import { defaultFill, defaultStrokeStyle, identityTransform } from '../model/defaults';
import type { Point } from '../model/geometry';
import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { PolygonObject } from '../model/types';
import type { Tool, ToolContext, ToolPreview } from './Tool';

const DOUBLE_CLICK_MS = 320;
const CLOSE_VERTEX_SCREEN_PX = 10;

function buildPolygonObject(absoluteVertices: Point[], layerId: string): PolygonObject {
  const cx = absoluteVertices.reduce((sum, p) => sum + p.x, 0) / absoluteVertices.length;
  const cy = absoluteVertices.reduce((sum, p) => sum + p.y, 0) / absoluteVertices.length;
  return {
    id: generateId('polygon'),
    type: 'polygon',
    layerId,
    parentId: null,
    visible: true,
    locked: false,
    opacity: 1,
    transform: identityTransform(cx, cy),
    vertices: absoluteVertices.map((p) => ({ x: p.x - cx, y: p.y - cy })),
    fill: defaultFill(),
    stroke: defaultStrokeStyle(),
    style: {},
  };
}

export class PolygonTool implements Tool {
  readonly id = 'polygon' as const;

  private vertices: Point[] = [];
  private cursor: Point | null = null;
  private lastDownTime = 0;

  pointerDown(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (e.buttons !== 1) return;
    const point = { x: e.worldX, y: e.worldY };
    const now = e.timestamp;
    const isDoubleClick = now - this.lastDownTime < DOUBLE_CLICK_MS;
    this.lastDownTime = now;

    if (this.vertices.length >= 3) {
      const firstScreen = ctx.camera.worldToScreen(this.vertices[0], ctx.getViewport());
      const closeToFirst = Math.hypot(e.screenX - firstScreen.x, e.screenY - firstScreen.y) <= CLOSE_VERTEX_SCREEN_PX;
      if (isDoubleClick || closeToFirst) {
        this.finish(ctx);
        return;
      }
    }

    this.vertices.push(point);
    this.cursor = point;
    ctx.requestRender();
  }

  pointerMove(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (this.vertices.length === 0) return;
    this.cursor = { x: e.worldX, y: e.worldY };
    ctx.requestRender();
  }

  pointerUp(): void {
    // Vertices are placed on pointerDown (click-by-click); nothing on release.
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      this.finish(ctx);
    } else if (e.key === 'Escape') {
      this.reset();
      ctx.requestRender();
    }
  }

  cancel(): void {
    this.reset();
  }

  getPreview(): ToolPreview | null {
    if (this.vertices.length === 0) return null;
    const previewVertices = this.cursor ? [...this.vertices, this.cursor] : this.vertices;
    return { kind: 'object', object: buildPolygonObject(previewVertices, 'preview') };
  }

  private finish(ctx: ToolContext): void {
    if (this.vertices.length >= 3) {
      const object = buildPolygonObject(this.vertices, ctx.document.defaultLayerId);
      ctx.commands.execute(new AddObjectsCommand(ctx.document, [object], 'Draw polygon'));
    }
    this.reset();
    ctx.requestRender();
  }

  private reset(): void {
    this.vertices = [];
    this.cursor = null;
  }
}
