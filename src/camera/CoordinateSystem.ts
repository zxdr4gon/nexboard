// Pure, tested coordinate math (spec sections 15-17, 186-187). Every
// consumer (Camera, PointerInput, GridRenderer) goes through these
// functions rather than re-deriving the formulas — see spec section 173
// mistake #15: "Use multiple different formulas for coordinate
// transforms across the codebase."
import type { Point, Size } from '../model/geometry';
import { clamp } from '../model/geometry';
import type { CameraState } from '../model/types';

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 64;

export function screenToWorld(camera: CameraState, screen: Point, viewport: Size): Point {
  return {
    x: camera.x + (screen.x - viewport.width / 2) / camera.zoom,
    y: camera.y + (screen.y - viewport.height / 2) / camera.zoom,
  };
}

export function worldToScreen(camera: CameraState, world: Point, viewport: Size): Point {
  return {
    x: (world.x - camera.x) * camera.zoom + viewport.width / 2,
    y: (world.y - camera.y) * camera.zoom + viewport.height / 2,
  };
}

// Solves for the new camera center such that the world point currently
// under the cursor stays under the cursor after the zoom changes.
export function zoomAtPointer(
  camera: CameraState,
  screen: Point,
  viewport: Size,
  nextZoom: number,
): CameraState {
  const currentWorld = screenToWorld(camera, screen, viewport);
  const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  return {
    zoom: clampedZoom,
    x: currentWorld.x - (screen.x - viewport.width / 2) / clampedZoom,
    y: currentWorld.y - (screen.y - viewport.height / 2) / clampedZoom,
  };
}

// Sign convention: dragging the paper right moves the camera left through
// the world (dx/dy are the pointer's screen-space delta).
export function panByScreenDelta(camera: CameraState, dx: number, dy: number): CameraState {
  return {
    ...camera,
    x: camera.x - dx / camera.zoom,
    y: camera.y - dy / camera.zoom,
  };
}
