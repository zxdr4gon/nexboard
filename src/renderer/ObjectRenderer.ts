import { buildSmoothPath } from '../smoothing/Bezier';
import type { ArrowObject, LineObject, Paint, StrokeStyle, WhiteboardObject } from '../model/types';
import type { ThemeManager } from '../theme/ThemeManager';

function applyStrokeStyle(ctx: CanvasRenderingContext2D, stroke: StrokeStyle, theme: ThemeManager): void {
  ctx.strokeStyle = theme.resolveColor(stroke.color);
  ctx.lineWidth = stroke.width;
  ctx.lineCap = stroke.cap;
  ctx.lineJoin = stroke.join;
  ctx.setLineDash(stroke.dash ?? []);
}

function resolveFillColor(fill: Paint, theme: ThemeManager): string | null {
  if (fill.type === 'none') return null;
  return theme.resolveColor(fill.color);
}

/**
 * Draws a stroke's arrowhead(s) (spec section 148): given unit direction
 * u and its perpendicular p, the two wing points are E - size*u ± width*p.
 */
function drawArrowhead(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, size: number): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const headWidth = size * 0.55;

  const wing1 = { x: to.x - size * ux + headWidth * px, y: to.y - size * uy + headWidth * py };
  const wing2 = { x: to.x - size * ux - headWidth * px, y: to.y - size * uy - headWidth * py };

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(wing1.x, wing1.y);
  ctx.lineTo(wing2.x, wing2.y);
  ctx.closePath();
  ctx.fill();
}

export class ObjectRenderer {
  render(ctx: CanvasRenderingContext2D, object: WhiteboardObject, theme: ThemeManager): void {
    switch (object.type) {
      case 'stroke':
        this.renderStroke(ctx, object, theme);
        break;
      case 'rectangle':
        this.renderRectangle(ctx, object, theme);
        break;
      case 'ellipse':
        this.renderEllipse(ctx, object, theme);
        break;
      case 'triangle':
        this.renderTriangle(ctx, object, theme);
        break;
      case 'polygon':
        this.renderPolygon(ctx, object, theme);
        break;
      case 'line':
        this.renderLineOrArrow(ctx, object, theme);
        break;
      case 'arrow':
        this.renderLineOrArrow(ctx, object, theme);
        break;
      case 'group':
        // Groups are never in getRenderOrder()'s output (they're expanded
        // into their children); this case only exists so the switch stays
        // exhaustive against the WhiteboardObject union.
        break;
    }
  }

  private renderStroke(ctx: CanvasRenderingContext2D, stroke: Extract<WhiteboardObject, { type: 'stroke' }>, theme: ThemeManager): void {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = stroke.opacity * stroke.brushSettings.opacity;
    ctx.strokeStyle = theme.resolveColor(stroke.color);
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(buildSmoothPath(stroke.points));
    ctx.restore();
  }

  private renderRectangle(ctx: CanvasRenderingContext2D, object: Extract<WhiteboardObject, { type: 'rectangle' }>, theme: ThemeManager): void {
    ctx.save();
    ctx.translate(object.transform.x, object.transform.y);
    ctx.rotate(object.transform.rotation);
    ctx.beginPath();
    const w = object.width;
    const h = object.height;
    if (object.radius > 0 && 'roundRect' in ctx) {
      (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(
        -w / 2,
        -h / 2,
        w,
        h,
        Math.min(object.radius, w / 2, h / 2),
      );
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    this.fillAndStroke(ctx, object.fill, object.stroke, object.opacity, theme);
    ctx.restore();
  }

  private renderEllipse(ctx: CanvasRenderingContext2D, object: Extract<WhiteboardObject, { type: 'ellipse' }>, theme: ThemeManager): void {
    ctx.save();
    ctx.translate(object.transform.x, object.transform.y);
    ctx.rotate(object.transform.rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(0.01, object.radiusX), Math.max(0.01, object.radiusY), 0, 0, Math.PI * 2);
    this.fillAndStroke(ctx, object.fill, object.stroke, object.opacity, theme);
    ctx.restore();
  }

  private renderTriangle(ctx: CanvasRenderingContext2D, object: Extract<WhiteboardObject, { type: 'triangle' }>, theme: ThemeManager): void {
    ctx.save();
    ctx.translate(object.transform.x, object.transform.y);
    ctx.rotate(object.transform.rotation);
    const hw = object.width / 2;
    const hh = object.height / 2;
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(-hw, hh);
    ctx.lineTo(hw, hh);
    ctx.closePath();
    this.fillAndStroke(ctx, object.fill, object.stroke, object.opacity, theme);
    ctx.restore();
  }

  private renderPolygon(ctx: CanvasRenderingContext2D, object: Extract<WhiteboardObject, { type: 'polygon' }>, theme: ThemeManager): void {
    if (object.vertices.length < 2) return;
    ctx.save();
    ctx.translate(object.transform.x, object.transform.y);
    ctx.rotate(object.transform.rotation);
    ctx.beginPath();
    ctx.moveTo(object.vertices[0].x, object.vertices[0].y);
    for (const v of object.vertices.slice(1)) ctx.lineTo(v.x, v.y);
    ctx.closePath();
    this.fillAndStroke(ctx, object.fill, object.stroke, object.opacity, theme);
    ctx.restore();
  }

  private renderLineOrArrow(ctx: CanvasRenderingContext2D, object: LineObject | ArrowObject, theme: ThemeManager): void {
    ctx.save();
    ctx.globalAlpha = object.opacity * object.stroke.opacity;
    applyStrokeStyle(ctx, object.stroke, theme);
    ctx.beginPath();
    ctx.moveTo(object.start.x, object.start.y);
    ctx.lineTo(object.end.x, object.end.y);
    ctx.stroke();

    if (object.type === 'arrow') {
      ctx.setLineDash([]);
      ctx.fillStyle = theme.resolveColor(object.stroke.color);
      if (object.arrowEnd) drawArrowhead(ctx, object.start, object.end, object.arrowSize);
      if (object.arrowStart) drawArrowhead(ctx, object.end, object.start, object.arrowSize);
    }
    ctx.restore();
  }

  private fillAndStroke(ctx: CanvasRenderingContext2D, fill: Paint, stroke: StrokeStyle, opacity: number, theme: ThemeManager): void {
    const fillColor = resolveFillColor(fill, theme);
    if (fillColor && fill.type === 'solid') {
      ctx.globalAlpha = opacity * fill.opacity;
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.globalAlpha = opacity * stroke.opacity;
    applyStrokeStyle(ctx, stroke, theme);
    ctx.stroke();
  }
}
