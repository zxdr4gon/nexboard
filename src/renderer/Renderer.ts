import type { CanvasManager } from '../canvas/CanvasManager';
import type { Camera } from '../camera/Camera';
import type { WhiteboardDocument } from '../document/Document';
import { buildSmoothPath } from '../smoothing/Bezier';
import { semanticColor } from '../theme/ColorResolver';
import type { ThemeManager } from '../theme/ThemeManager';
import type { ToolPreview } from '../tools/Tool';
import { GridRenderer } from './GridRenderer';
import { ObjectRenderer } from './ObjectRenderer';
import { OverlayRenderer, type OverlayState } from './OverlayRenderer';

const PREVIEW_OPACITY = 0.6;

// Render pass (spec section 184): clear -> screen-space background ->
// world transform -> grid -> objects -> in-progress tool preview ->
// restore -> screen-space overlays (selection handles, marquee, guides).
export class Renderer {
  private grid = new GridRenderer();
  private objects = new ObjectRenderer();
  private overlay = new OverlayRenderer();
  private preview: ToolPreview | null = null;
  private overlayState: OverlayState | null = null;

  setToolPreview(preview: ToolPreview | null): void {
    this.preview = preview;
  }

  setOverlay(overlay: OverlayState | null): void {
    this.overlayState = overlay;
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

    for (const object of document.getRenderOrder()) {
      if (!object.visible) continue;
      this.objects.render(ctx, object, theme);
    }

    this.renderPreview(ctx, theme);

    ctx.restore();

    if (this.overlayState) {
      this.overlay.render(ctx, this.overlayState, camera, viewport, theme);
    }
  }

  private renderPreview(ctx: CanvasRenderingContext2D, theme: ThemeManager): void {
    if (!this.preview) return;
    ctx.save();
    ctx.globalAlpha = PREVIEW_OPACITY;
    if (this.preview.kind === 'object') {
      // Each shape's own render method sets ctx.globalAlpha explicitly
      // from its own opacity fields, which would otherwise clobber the
      // ambient PREVIEW_OPACITY set above — so bake it into a cloned
      // object's opacity instead of relying on ambient canvas state.
      const faded = { ...this.preview.object, opacity: this.preview.object.opacity * PREVIEW_OPACITY };
      this.objects.render(ctx, faded, theme);
    } else if (this.preview.points.length >= 2) {
      ctx.strokeStyle = theme.resolveColor(semanticColor('ink-primary'));
      ctx.lineWidth = this.preview.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(buildSmoothPath(this.preview.points));
    }
    ctx.restore();
  }
}
