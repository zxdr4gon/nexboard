import type { WhiteboardObject } from '../model/types';
import { buildSmoothPath } from '../smoothing/Bezier';
import type { ThemeManager } from '../theme/ThemeManager';

// Phase 1 only knows how to render stroke objects. This switches on
// object.type so that Phase 2's shapes/text/images slot in as new
// cases without touching the Renderer or the render pass.
export class ObjectRenderer {
  render(ctx: CanvasRenderingContext2D, object: WhiteboardObject, theme: ThemeManager): void {
    switch (object.type) {
      case 'stroke':
        this.renderStroke(ctx, object, theme);
        break;
    }
  }

  private renderStroke(
    ctx: CanvasRenderingContext2D,
    stroke: Extract<WhiteboardObject, { type: 'stroke' }>,
    theme: ThemeManager,
  ): void {
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
}
