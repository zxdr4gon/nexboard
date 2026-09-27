// Spec section 41 (hit testing) + section 235 (hit test priority):
// convert the pointer into each object's local space via the inverse
// transform, test against local geometry, and walk objects in reverse
// render order so the topmost object wins. Locked/hidden/grouped
// objects are resolved per spec sections 106/233.
import { distance, pointInPolygon, pointToSegmentDistance, rotatePoint } from '../model/geometry';
import type { Point } from '../model/geometry';
import type { WhiteboardDocument } from '../document/Document';
import type { WhiteboardObject } from '../model/types';

/** Selection tolerance in world units for thin geometry (lines, stroke width, unfilled shape edges). */
function edgeTolerance(zoom: number): number {
  return 6 / zoom;
}

export function hitTestObject(object: WhiteboardObject, point: Point, zoom: number): boolean {
  const tolerance = edgeTolerance(zoom);
  switch (object.type) {
    case 'stroke': {
      const halfWidth = object.width / 2 + tolerance;
      for (let i = 0; i < object.points.length - 1; i++) {
        if (pointToSegmentDistance(point, object.points[i], object.points[i + 1]) <= halfWidth) return true;
      }
      return object.points.length === 1 && distance(point, object.points[0]) <= halfWidth;
    }
    case 'line':
    case 'arrow':
      return pointToSegmentDistance(point, object.start, object.end) <= object.stroke.width / 2 + tolerance;
    case 'rectangle': {
      const local = rotatePoint(point, { x: object.transform.x, y: object.transform.y }, -object.transform.rotation);
      const lx = local.x - object.transform.x;
      const ly = local.y - object.transform.y;
      if (object.fill.type !== 'none') {
        return Math.abs(lx) <= object.width / 2 && Math.abs(ly) <= object.height / 2;
      }
      const hw = object.width / 2 + tolerance;
      const hh = object.height / 2 + tolerance;
      const insideOuter = Math.abs(lx) <= hw && Math.abs(ly) <= hh;
      const insideInner = Math.abs(lx) <= object.width / 2 - tolerance && Math.abs(ly) <= object.height / 2 - tolerance;
      return insideOuter && !insideInner;
    }
    case 'triangle': {
      const local = rotatePoint(point, { x: object.transform.x, y: object.transform.y }, -object.transform.rotation);
      const { x: cx, y: cy } = object.transform;
      const hw = object.width / 2;
      const hh = object.height / 2;
      const verts = [
        { x: cx, y: cy - hh },
        { x: cx - hw, y: cy + hh },
        { x: cx + hw, y: cy + hh },
      ];
      if (object.fill.type !== 'none' && pointInPolygon(local, verts)) return true;
      for (let i = 0; i < verts.length; i++) {
        if (pointToSegmentDistance(local, verts[i], verts[(i + 1) % verts.length]) <= tolerance) return true;
      }
      return false;
    }
    case 'ellipse': {
      const local = rotatePoint(point, { x: object.transform.x, y: object.transform.y }, -object.transform.rotation);
      const lx = (local.x - object.transform.x) / (object.radiusX + (object.fill.type === 'none' ? tolerance : 0));
      const ly = (local.y - object.transform.y) / (object.radiusY + (object.fill.type === 'none' ? tolerance : 0));
      const normalized = lx * lx + ly * ly;
      if (object.fill.type !== 'none') return normalized <= 1;
      const innerLx = (local.x - object.transform.x) / Math.max(0.01, object.radiusX - tolerance);
      const innerLy = (local.y - object.transform.y) / Math.max(0.01, object.radiusY - tolerance);
      return normalized <= 1 && innerLx * innerLx + innerLy * innerLy >= 1;
    }
    case 'polygon': {
      const local = rotatePoint(point, { x: object.transform.x, y: object.transform.y }, -object.transform.rotation);
      const worldVerts = object.vertices.map((v) => ({ x: object.transform.x + v.x, y: object.transform.y + v.y }));
      if (object.fill.type !== 'none' && pointInPolygon(local, worldVerts)) return true;
      for (let i = 0; i < worldVerts.length; i++) {
        const a = worldVerts[i];
        const b = worldVerts[(i + 1) % worldVerts.length];
        if (pointToSegmentDistance(local, a, b) <= tolerance) return true;
      }
      return false;
    }
    case 'group':
      return false; // groups are never hit directly; children resolve up to the group (see findTopmostObjectAt)
  }
}

export interface HitTestOptions {
  /** If true, locked objects can still be hit (used by a future layer panel; unused by ordinary pointer interaction). */
  includeLocked?: boolean;
}

/**
 * Finds the topmost object under a world point, in reverse render order.
 * If the hit object belongs to a group, returns the group instead (Phase
 * 2 groups are atomic — see README on single-level grouping).
 */
export function findTopmostObjectAt(
  document: WhiteboardDocument,
  point: Point,
  zoom: number,
  options: HitTestOptions = {},
): WhiteboardObject | undefined {
  const order = document.getRenderOrder();
  for (let i = order.length - 1; i >= 0; i--) {
    const object = order[i];
    if (!object.visible) continue;
    if (object.locked && !options.includeLocked) continue;
    if (hitTestObject(object, point, zoom)) {
      if (object.parentId) {
        const parent = document.getObject(object.parentId);
        if (parent && parent.type === 'group') return parent;
      }
      return object;
    }
  }
  return undefined;
}
