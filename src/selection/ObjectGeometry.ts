// Shared per-type geometry operations (spec section 42: "Store
// normalized object geometry in local space, then apply transforms at
// render/hit-test time"). Every selection interaction — move, resize,
// rotate, bounds computation for handles/marquee/snapping — goes
// through these functions instead of ad hoc per-tool math, so adding a
// new object type means extending these switches once rather than
// touching SelectTool, HitTesting, SnapManager, and OverlayRenderer
// separately.
import type { Bounds, Point } from '../model/geometry';
import { boundsFromPoints, rotatePoint } from '../model/geometry';
import type { WhiteboardDocument } from '../document/Document';
import type { WhiteboardObject } from '../model/types';

/** The shape's local, unrotated corner points in WORLD space (before rotation). */
function localCorners(object: WhiteboardObject): Point[] {
  switch (object.type) {
    case 'rectangle':
    case 'triangle': {
      const { x, y } = object.transform;
      const hw = object.width / 2;
      const hh = object.height / 2;
      return [
        { x: x - hw, y: y - hh },
        { x: x + hw, y: y - hh },
        { x: x + hw, y: y + hh },
        { x: x - hw, y: y + hh },
      ];
    }
    case 'ellipse': {
      const { x, y } = object.transform;
      const rx = object.radiusX;
      const ry = object.radiusY;
      return [
        { x: x - rx, y: y - ry },
        { x: x + rx, y: y - ry },
        { x: x + rx, y: y + ry },
        { x: x - rx, y: y + ry },
      ];
    }
    case 'polygon': {
      const { x, y } = object.transform;
      return object.vertices.map((v) => ({ x: x + v.x, y: y + v.y }));
    }
    case 'line':
    case 'arrow':
      return [object.start, object.end];
    case 'stroke':
      return object.points;
    case 'group':
      // Groups don't own geometry directly; callers should union their
      // children's bounds instead (see getGroupChildrenBounds below).
      return [];
  }
}

/** World-space, rotation-aware bounding box for a single object. */
export function getObjectBounds(object: WhiteboardObject): Bounds {
  const corners = localCorners(object);
  const rotation = object.transform.rotation;
  const rotated =
    rotation === 0
      ? corners
      : corners.map((p) => rotatePoint(p, { x: object.transform.x, y: object.transform.y }, rotation));
  return boundsFromPoints(rotated.length > 0 ? rotated : [{ x: 0, y: 0 }]);
}

/** Union of a set of objects' bounds — used for multi-select / group bounds. */
export function getUnionBounds(objects: WhiteboardObject[]): Bounds | null {
  if (objects.length === 0) return null;
  let result = getObjectBounds(objects[0]);
  for (const object of objects.slice(1)) {
    const b = getObjectBounds(object);
    result = {
      minX: Math.min(result.minX, b.minX),
      minY: Math.min(result.minY, b.minY),
      maxX: Math.max(result.maxX, b.maxX),
      maxY: Math.max(result.maxY, b.maxY),
    };
  }
  return result;
}

export function getObjectCenter(object: WhiteboardObject): Point {
  switch (object.type) {
    case 'line':
    case 'arrow':
      return { x: (object.start.x + object.end.x) / 2, y: (object.start.y + object.end.y) / 2 };
    case 'stroke': {
      const b = boundsFromPoints(object.points);
      return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    }
    case 'group':
      return { x: object.transform.x, y: object.transform.y };
    default:
      return { x: object.transform.x, y: object.transform.y };
  }
}

/** Translate an object by a world-space delta. Returns a new object (immutable style, for command snapshots). */
export function translateObject<T extends WhiteboardObject>(object: T, dx: number, dy: number): T {
  switch (object.type) {
    case 'line':
    case 'arrow':
      return {
        ...object,
        start: { x: object.start.x + dx, y: object.start.y + dy },
        end: { x: object.end.x + dx, y: object.end.y + dy },
      };
    case 'stroke':
      return { ...object, points: object.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) };
    default:
      return { ...object, transform: { ...object.transform, x: object.transform.x + dx, y: object.transform.y + dy } };
  }
}

/** Rotate an object about an arbitrary pivot by deltaTheta radians. */
export function rotateObjectAroundPivot<T extends WhiteboardObject>(object: T, pivot: Point, deltaTheta: number): T {
  switch (object.type) {
    case 'line':
    case 'arrow':
      return {
        ...object,
        start: rotatePoint(object.start, pivot, deltaTheta),
        end: rotatePoint(object.end, pivot, deltaTheta),
      };
    case 'stroke':
      return { ...object, points: object.points.map((p) => ({ ...p, ...rotatePoint(p, pivot, deltaTheta) })) };
    case 'group':
      // Groups themselves have no drawable geometry; SelectTool rotates
      // each child individually with this same pivot instead of calling
      // this branch. Kept here only so the switch is exhaustive.
      return object;
    default: {
      const center = rotatePoint({ x: object.transform.x, y: object.transform.y }, pivot, deltaTheta);
      return {
        ...object,
        transform: { ...object.transform, x: center.x, y: center.y, rotation: object.transform.rotation + deltaTheta },
      };
    }
  }
}

/**
 * Scale an object about a fixed pivot point (typically the opposite resize
 * handle, or the object/selection center when resizing from center).
 * Mutates the object's own size fields directly rather than
 * transform.scaleX/scaleY — see the comment in model/types.ts.
 */
export function scaleObjectAroundPivot<T extends WhiteboardObject>(
  object: T,
  pivot: Point,
  scaleX: number,
  scaleY: number,
): T {
  const scalePoint = (p: Point): Point => ({
    x: pivot.x + (p.x - pivot.x) * scaleX,
    y: pivot.y + (p.y - pivot.y) * scaleY,
  });

  switch (object.type) {
    case 'line':
    case 'arrow':
      return { ...object, start: scalePoint(object.start), end: scalePoint(object.end) };
    case 'stroke':
      return { ...object, points: object.points.map((p) => ({ ...p, ...scalePoint(p) })) };
    case 'rectangle':
    case 'triangle': {
      const center = scalePoint({ x: object.transform.x, y: object.transform.y });
      return {
        ...object,
        width: Math.max(1, Math.abs(object.width * scaleX)),
        height: Math.max(1, Math.abs(object.height * scaleY)),
        transform: { ...object.transform, x: center.x, y: center.y },
      };
    }
    case 'ellipse': {
      const center = scalePoint({ x: object.transform.x, y: object.transform.y });
      return {
        ...object,
        radiusX: Math.max(0.5, Math.abs(object.radiusX * scaleX)),
        radiusY: Math.max(0.5, Math.abs(object.radiusY * scaleY)),
        transform: { ...object.transform, x: center.x, y: center.y },
      };
    }
    case 'polygon': {
      const center = scalePoint({ x: object.transform.x, y: object.transform.y });
      return {
        ...object,
        vertices: object.vertices.map((v) => ({ x: v.x * scaleX, y: v.y * scaleY })),
        transform: { ...object.transform, x: center.x, y: center.y },
      };
    }
    case 'group':
      return object;
  }
}

/**
 * Expands any GroupObject in the list into its children (single level —
 * Phase 2 groups never nest). Bounds/move/resize/rotate all operate on
 * the group's children directly (the "flatten transforms" approach
 * documented in model/types.ts) — a raw GroupObject has no drawable
 * geometry of its own, so callers must resolve through this before
 * computing bounds or applying a transform to a selection.
 */
export function resolveToLeafObjects(document: WhiteboardDocument, objects: WhiteboardObject[]): WhiteboardObject[] {
  const result: WhiteboardObject[] = [];
  const seen = new Set<string>();
  for (const object of objects) {
    if (object.type === 'group') {
      for (const childId of object.childIds) {
        const child = document.getObject(childId);
        if (child && !seen.has(child.id)) {
          seen.add(child.id);
          result.push(child);
        }
      }
    } else if (!seen.has(object.id)) {
      seen.add(object.id);
      result.push(object);
    }
  }
  return result;
}
