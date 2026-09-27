// Shape recognition pipeline (spec section 33): normalize -> simplify ->
// extract features -> score candidates -> return the best match above
// threshold, or null (meaning: keep the freehand stroke as drawn).
//
// Deliberate MVP simplifications, documented rather than hidden:
//  - Rectangle recognition returns an AXIS-ALIGNED rectangle. The spec
//    (section 35) suggests normalizing a rotated hand-drawn rectangle
//    to a perfect ROTATED one; that requires estimating the dominant
//    edge angle, which this recognizer does not attempt yet.
//  - Recognized triangles are always canonicalized to an upright
//    isosceles triangle matching the gesture's bounding box, not fit to
//    the drawn triangle's actual vertex positions (section 37 allows
//    either).
import { generateId } from '../document/ObjectId';
import type { Point } from '../model/geometry';
import { boundsFromPoints, distance, pointToSegmentDistance } from '../model/geometry';
import { defaultFill, defaultStrokeStyle, identityTransform } from '../model/defaults';
import type { StrokePoint, WhiteboardObject } from '../model/types';

export type RecognizedShape =
  | { kind: 'line'; start: Point; end: Point; confidence: number }
  | { kind: 'rectangle'; x: number; y: number; width: number; height: number; confidence: number }
  | { kind: 'ellipse'; x: number; y: number; radiusX: number; radiusY: number; confidence: number }
  | { kind: 'triangle'; x: number; y: number; width: number; height: number; confidence: number };

const MIN_POINTS = 6;
const MIN_DIAGONAL = 20;
const LINE_STRAIGHTNESS_THRESHOLD = 0.94;
const LINE_MIN_LENGTH = 24;
const CLOSURE_RATIO_THRESHOLD = 0.3;
const ELLIPSE_CV_THRESHOLD = 0.22;

function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

/** Ramer-Douglas-Peucker simplification. */
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToSegmentDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIndex = i;
    }
  }
  if (maxDist > tolerance) {
    const left = simplify(points.slice(0, maxIndex + 1), tolerance);
    const right = simplify(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

export function recognizeStroke(rawPoints: StrokePoint[]): RecognizedShape | null {
  if (rawPoints.length < MIN_POINTS) return null;
  const points: Point[] = rawPoints.map((p) => ({ x: p.x, y: p.y }));

  const bbox = boundsFromPoints(points);
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const diagonal = Math.hypot(width, height);
  if (diagonal < MIN_DIAGONAL) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const chord = distance(start, end);
  const length = pathLength(points);
  const straightness = length > 0 ? chord / length : 0;

  if (straightness >= LINE_STRAIGHTNESS_THRESHOLD && length >= LINE_MIN_LENGTH) {
    return { kind: 'line', start, end, confidence: straightness };
  }

  const closureRatio = chord / Math.max(width, height, 1);
  if (closureRatio > CLOSURE_RATIO_THRESHOLD) return null; // not straight, not closed -> genuine freehand

  const center = { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };

  // Corner sharpness is checked BEFORE roundness: a shape with clean 90°
  // corners can still have a fairly moderate radius-from-centroid
  // variance (a rectangle's corner-to-edge-midpoint ratio isn't that
  // extreme unless it's very elongated), so checking roundness first
  // risked misclassifying ordinary rectangles as ellipses. Sharp
  // corners are the more reliable signal when present.
  const simplified = simplify(points, diagonal * 0.045);
  const closesOnItself = distance(simplified[0], simplified[simplified.length - 1]) < diagonal * 0.09;
  const cornerCount = closesOnItself ? simplified.length - 1 : simplified.length;

  if (cornerCount === 4) {
    return { kind: 'rectangle', x: center.x, y: center.y, width, height, confidence: 0.85 };
  }
  if (cornerCount === 3) {
    return { kind: 'triangle', x: center.x, y: center.y, width, height, confidence: 0.8 };
  }

  const radii = points.map((p) => distance(p, center));
  const meanRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
  const variance = radii.reduce((a, r) => a + (r - meanRadius) ** 2, 0) / radii.length;
  const coefficientOfVariation = meanRadius > 0 ? Math.sqrt(variance) / meanRadius : 1;

  if (coefficientOfVariation < ELLIPSE_CV_THRESHOLD) {
    return {
      kind: 'ellipse',
      x: center.x,
      y: center.y,
      radiusX: width / 2,
      radiusY: height / 2,
      confidence: 1 - coefficientOfVariation,
    };
  }

  return null;
}

/** Builds the canonical committed object for a recognized shape (spec section 33's last pipeline step). */
export function createObjectFromRecognizedShape(shape: RecognizedShape, layerId: string): WhiteboardObject {
  const base = {
    id: generateId(shape.kind),
    layerId,
    parentId: null,
    visible: true,
    locked: false,
    opacity: 1,
    style: {},
  } as const;
  const stroke = defaultStrokeStyle();

  switch (shape.kind) {
    case 'line':
      return { ...base, type: 'line', transform: identityTransform(), start: shape.start, end: shape.end, stroke };
    case 'rectangle':
      return {
        ...base,
        type: 'rectangle',
        transform: identityTransform(shape.x, shape.y),
        width: shape.width,
        height: shape.height,
        radius: 0,
        fill: defaultFill(),
        stroke,
      };
    case 'ellipse':
      return {
        ...base,
        type: 'ellipse',
        transform: identityTransform(shape.x, shape.y),
        radiusX: shape.radiusX,
        radiusY: shape.radiusY,
        fill: defaultFill(),
        stroke,
      };
    case 'triangle':
      return {
        ...base,
        type: 'triangle',
        transform: identityTransform(shape.x, shape.y),
        width: shape.width,
        height: shape.height,
        fill: defaultFill(),
        stroke,
      };
  }
}
