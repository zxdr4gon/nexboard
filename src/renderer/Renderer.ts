import type { CanvasManager } from '../canvas/CanvasManager';
import type { Camera } from '../camera/Camera';
import type { WhiteboardDocument } from '../document/Document';
import type { StrokePoint } from '../model/types';
import { buildSmoothPath } from '../smoothing/Bezier';
import { semanticColor } from '../theme/ColorResolver';
import type { ThemeManager } from '../theme/ThemeManager';
import { GridRenderer } from './GridRenderer';
import { ObjectRenderer } from './ObjectRenderer';

export interface PreviewStroke {
  points: StrokePoint[];
  width: number;
}

// Implements the render pass from spec section 184: clear -> screen-space
// background -> world transform -> grid -> objects -> restore ->
// screen-space overlays. The in-progress stroke preview is drawn inside
// the world-space block (it's world geometry), while the coordinate/zoom
// HUD is plain DOM (see App) rather than a canvas overlay pass — there's
// no selection UI yet to justify a dedicated OverlayRenderer in Phase 1,
// so that module is deferred to Phase 2 rather than stubbed out empty.
export class Renderer {
  private grid = new GridRenderer();
  private objects = new ObjectRenderer();
  private previewStroke: PreviewStroke | null = null;

  setPreviewStroke(preview: PreviewStroke | null): void {
    this.previewStroke = preview;
  }

  render(canvasManager: CanvasManager, camera: Camera, document: WhiteboardDocument, theme: ThemeManager): void {
    const { ctx, canvas, dpr } = canvasManager;
    const viewport = canvasManager.getViewportSize();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = theme.resolveColor(semanticColor('background'));
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    const { x: cx, y: cy, zoom } = camera.state;
    ctx.setTransform(
      dpr * zoom,
      0,
      0,
      dpr * zoom,
      dpr * (viewport.width / 2 - cx * zoom),
      dpr * (viewport.height / 2 - cy * zoom),
    );

    if (document.getSettings().grid.visible) {
      this.grid.render(ctx, camera.state, viewport, theme);
    }

    for (const object of document.getObjects()) {
      if (!object.visible) continue;
      this.objects.render(ctx, object, theme);
    }

    if (this.previewStroke && this.previewStroke.points.length >= 2) {
      ctx.save();
      ctx.strokeStyle = theme.resolveColor(semanticColor('ink-primary'));
      ctx.lineWidth = this.previewStroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(buildSmoothPath(this.previewStroke.points));
      ctx.restore();
    }

    ctx.restore();
  }
}
