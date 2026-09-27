// Screen-space selection UI (spec sections 40/43-45): drawn AFTER the
// world transform is restored, so handle size and line width stay
// constant on screen regardless of zoom. This is the module Phase 1's
// README flagged as deferred until there was real selection UI to draw
// — Phase 2 is that point.
import type { Camera } from '../camera/Camera';
import type { Bounds, Size } from '../model/geometry';
import type { HandleInfo } from '../selection/Handles';
import type { AlignmentGuide } from '../selection/SnapManager';
import { semanticColor } from '../theme/ColorResolver';
import type { ThemeManager } from '../theme/ThemeManager';

export interface OverlayState {
  worldBounds: Bounds | null;
  handles: HandleInfo[];
  marqueeWorld: Bounds | null;
  guides: AlignmentGuide[];
}

const HANDLE_SIZE = 8;

export class OverlayRenderer {
  render(ctx: CanvasRenderingContext2D, overlay: OverlayState, camera: Camera, viewport: Size, theme: ThemeManager): void {
    const accent = theme.resolveColor(semanticColor('accent'));

    if (overlay.guides.length > 0) {
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (const guide of overlay.guides) {
        ctx.beginPath();
        if (guide.axis === 'x') {
          const screenX = camera.worldToScreen({ x: guide.at, y: 0 }, viewport).x;
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, viewport.height);
        } else {
          const screenY = camera.worldToScreen({ x: 0, y: guide.at }, viewport).y;
          ctx.moveTo(0, screenY);
          ctx.lineTo(viewport.width, screenY);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    if (overlay.marqueeWorld) {
      const b = overlay.marqueeWorld;
      const topLeft = camera.worldToScreen({ x: b.minX, y: b.minY }, viewport);
      const bottomRight = camera.worldToScreen({ x: b.maxX, y: b.maxY }, viewport);
      ctx.save();
      ctx.fillStyle = withAlpha(accent, 0.12);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    }

    if (overlay.worldBounds) {
      const b = overlay.worldBounds;
      const topLeft = camera.worldToScreen({ x: b.minX, y: b.minY }, viewport);
      const bottomRight = camera.worldToScreen({ x: b.maxX, y: b.maxY }, viewport);
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    }

    for (const handle of overlay.handles) {
      ctx.save();
      if (handle.type === 'rotate') {
        ctx.beginPath();
        ctx.arc(handle.screen.x, handle.screen.y, HANDLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.fillRect(handle.screen.x - HANDLE_SIZE / 2, handle.screen.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(handle.screen.x - HANDLE_SIZE / 2, handle.screen.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      }
      ctx.restore();
    }
  }
}

function withAlpha(hexColor: string, alpha: number): string {
  // Only handles #rrggbb input, which is all ThemeTokens produces.
  if (!/^#([0-9a-fA-F]{6})$/.test(hexColor)) return hexColor;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
