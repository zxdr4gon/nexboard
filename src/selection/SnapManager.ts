// Spec sections 19-20 (grid snap), 39 (angle snap), 45/113-114 (object
// alignment guides). All three return both a snapped value AND enough
// info for OverlayRenderer to draw the "visually clear" feedback the
// Phase 2 acceptance criteria calls for — a snap that happens silently
// isn't a good implementation of this spec.
import type { Bounds, Point } from '../model/geometry';
import { boundsCenter } from '../model/geometry';

export function snapPointToGrid(point: Point, spacing: number): Point {
  return {
    x: Math.round(point.x / spacing) * spacing,
    y: Math.round(point.y / spacing) * spacing,
  };
}

export function snapAngle(radians: number, incrementDegrees = 15): number {
  const increment = (incrementDegrees * Math.PI) / 180;
  return Math.round(radians / increment) * increment;
}

export interface AlignmentGuide {
  axis: 'x' | 'y';
  /** World coordinate the guide line runs along. */
  at: number;
}

export interface AlignmentSnapResult {
  dx: number;
  dy: number;
  guides: AlignmentGuide[];
}

/**
 * Checks the moving selection's bounds against every other object's
 * bounds for near-alignment (edges and centers) and returns a
 * correcting offset plus the guide lines to draw. Only the single best
 * match per axis is used, matching typical "smart guide" behavior.
 */
export function computeAlignmentSnap(
  movingBounds: Bounds,
  otherBounds: Bounds[],
  toleranceWorld: number,
): AlignmentSnapResult {
  const movingCenter = boundsCenter(movingBounds);
  const movingXs = [movingBounds.minX, movingCenter.x, movingBounds.maxX];
  const movingYs = [movingBounds.minY, movingCenter.y, movingBounds.maxY];

  let bestDx = 0;
  let bestDxDist = toleranceWorld;
  let guideX: number | null = null;

  let bestDy = 0;
  let bestDyDist = toleranceWorld;
  let guideY: number | null = null;

  for (const other of otherBounds) {
    const otherCenter = boundsCenter(other);
    const otherXs = [other.minX, otherCenter.x, other.maxX];
    const otherYs = [other.minY, otherCenter.y, other.maxY];

    for (const mx of movingXs) {
      for (const ox of otherXs) {
        const dist = Math.abs(ox - mx);
        if (dist < bestDxDist) {
          bestDxDist = dist;
          bestDx = ox - mx;
          guideX = ox;
        }
      }
    }
    for (const my of movingYs) {
      for (const oy of otherYs) {
        const dist = Math.abs(oy - my);
        if (dist < bestDyDist) {
          bestDyDist = dist;
          bestDy = oy - my;
          guideY = oy;
        }
      }
    }
  }

  const guides: AlignmentGuide[] = [];
  if (guideX !== null) guides.push({ axis: 'x', at: guideX });
  if (guideY !== null) guides.push({ axis: 'y', at: guideY });

  return { dx: guideX !== null ? bestDx : 0, dy: guideY !== null ? bestDy : 0, guides };
}
