import type { Point } from '../model/geometry';

// Quadratic midpoint smoothing (spec section 24): each drawn segment runs
// between the midpoints of consecutive point pairs, using the shared
// point as the curve's control point. Produces a visually smooth stroke
// without needing full spline fitting for Phase 1.
export function buildSmoothPath(points: Point[]): Path2D {
  const path = new Path2D();
  if (points.length === 0) return path;

  if (points.length < 3) {
    path.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) path.lineTo(p.x, p.y);
    return path;
  }

  const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  path.moveTo(points[0].x, points[0].y);
  let firstMid = midpoint(points[0], points[1]);
  path.lineTo(firstMid.x, firstMid.y);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const nextMid = midpoint(current, next);
    path.quadraticCurveTo(current.x, current.y, nextMid.x, nextMid.y);
  }

  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);
  return path;
}
