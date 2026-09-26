import type { Size } from '../model/geometry';
import type { CameraState } from '../model/types';
import { semanticColor } from '../theme/ColorResolver';
import type { ThemeManager } from '../theme/ThemeManager';

// Adaptive dot grid (spec sections 19-20). Spacing is chosen from a
// 1-2-5 progression so the on-screen gap between minor dots stays near
// TARGET_SCREEN_SPACING regardless of zoom — this is what keeps the
// grid feeling "infinite" rather than becoming a solid smear when
// zoomed out or disappearing when zoomed in.
const NICE_STEPS = [1, 2, 5];
const TARGET_SCREEN_SPACING = 72;

function niceSpacing(worldPerPixelTarget: number): number {
  const exponent = Math.floor(Math.log10(worldPerPixelTarget));
  let best = NICE_STEPS[0] * 10 ** exponent;
  let bestDiff = Infinity;
  for (const e of [exponent - 1, exponent, exponent + 1]) {
    for (const step of NICE_STEPS) {
      const candidate = step * 10 ** e;
      const diff = Math.abs(candidate - worldPerPixelTarget);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = candidate;
      }
    }
  }
  return best;
}

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, camera: CameraState, viewport: Size, theme: ThemeManager): void {
    const targetWorldSpacing = TARGET_SCREEN_SPACING / camera.zoom;
    const minorSpacing = niceSpacing(targetWorldSpacing);
    const majorSpacing = minorSpacing * 5;

    const left = camera.x - viewport.width / 2 / camera.zoom;
    const right = camera.x + viewport.width / 2 / camera.zoom;
    const top = camera.y - viewport.height / 2 / camera.zoom;
    const bottom = camera.y + viewport.height / 2 / camera.zoom;

    const minorColor = theme.resolveColor(semanticColor('grid-minor'));
    const majorColor = theme.resolveColor(semanticColor('grid-major'));
    const minorRadius = Math.max(0.6, 1 / camera.zoom);
    const majorRadius = Math.max(0.9, 1.6 / camera.zoom);

    const startX = Math.floor(left / minorSpacing) * minorSpacing;
    const startY = Math.floor(top / minorSpacing) * minorSpacing;

    for (let x = startX; x <= right; x += minorSpacing) {
      const isMajorX = Math.abs(x % majorSpacing) < minorSpacing / 2;
      for (let y = startY; y <= bottom; y += minorSpacing) {
        const isMajorY = Math.abs(y % majorSpacing) < minorSpacing / 2;
        const isMajor = isMajorX && isMajorY;
        ctx.beginPath();
        ctx.fillStyle = isMajor ? majorColor : minorColor;
        ctx.arc(x, y, isMajor ? majorRadius : minorRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
