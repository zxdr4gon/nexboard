// Spec sections 43-44 (rotation/resize handles).
//
// Simplification (documented): handles are always computed from the
// selection's AXIS-ALIGNED bounding box, never an oriented one. For an
// unrotated object (the common case) this is exact. For a single
// object that's already been rotated, the handle box sits on its AABB
// rather than its true rotated corners, so a resize drag maps world
// axes onto the object's local width/height directly — it still works
// and never shears/corrupts the shape, but doesn't feel perfectly
// aligned with the object's own edges until it's rotated back near 0°.
// True oriented-bounding-box resize is deferred (see README).
import type { Camera } from '../camera/Camera';
import type { Bounds, Point, Size } from '../model/geometry';
import { boundsCenter } from '../model/geometry';

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

export interface HandleInfo {
  type: HandleType;
  screen: Point;
  cursor: string;
}

export const HANDLE_SIGNS: Record<Exclude<HandleType, 'rotate'>, { x: number; y: number }> = {
  nw: { x: -1, y: -1 },
  n: { x: 0, y: -1 },
  ne: { x: 1, y: -1 },
  e: { x: 1, y: 0 },
  se: { x: 1, y: 1 },
  s: { x: 0, y: 1 },
  sw: { x: -1, y: 1 },
  w: { x: -1, y: 0 },
};

const CURSORS: Record<Exclude<HandleType, 'rotate'>, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

const ROTATE_HANDLE_SCREEN_OFFSET = 28;
export const HANDLE_HIT_RADIUS_SCREEN = 9;

export function computeHandles(bounds: Bounds, camera: Camera, viewport: Size): HandleInfo[] {
  const center = boundsCenter(bounds);
  const hw = (bounds.maxX - bounds.minX) / 2;
  const hh = (bounds.maxY - bounds.minY) / 2;

  const handles: HandleInfo[] = (Object.keys(HANDLE_SIGNS) as Exclude<HandleType, 'rotate'>[]).map((type) => {
    const sign = HANDLE_SIGNS[type];
    const world = { x: center.x + sign.x * hw, y: center.y + sign.y * hh };
    return { type, screen: camera.worldToScreen(world, viewport), cursor: CURSORS[type] };
  });

  const topCenterWorld = { x: center.x, y: center.y - hh };
  const worldOffset = ROTATE_HANDLE_SCREEN_OFFSET / camera.state.zoom;
  const rotateWorld = { x: topCenterWorld.x, y: topCenterWorld.y - worldOffset };
  handles.push({ type: 'rotate', screen: camera.worldToScreen(rotateWorld, viewport), cursor: 'grab' });

  return handles;
}

export function hitTestHandle(handles: HandleInfo[], screenPoint: Point): HandleInfo | undefined {
  return handles.find(
    (h) => Math.hypot(h.screen.x - screenPoint.x, h.screen.y - screenPoint.y) <= HANDLE_HIT_RADIUS_SCREEN,
  );
}
