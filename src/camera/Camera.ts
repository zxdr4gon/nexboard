import type { Point, Size } from '../model/geometry';
import type { CameraState } from '../model/types';
import { panByScreenDelta, screenToWorld, worldToScreen, zoomAtPointer } from './CoordinateSystem';

type Listener = () => void;

// Implements the Camera contract from spec section 180.1. fitBounds()
// is intentionally not implemented yet — it belongs with the "Fit
// Content" export feature in Phase 3 (spec section 77), which is the
// first place it's actually needed.
export class Camera {
  state: CameraState;
  private listeners = new Set<Listener>();

  constructor(initial: CameraState = { x: 0, y: 0, zoom: 1 }) {
    this.state = initial;
  }

  screenToWorld(screen: Point, viewport: Size): Point {
    return screenToWorld(this.state, screen, viewport);
  }

  worldToScreen(world: Point, viewport: Size): Point {
    return worldToScreen(this.state, world, viewport);
  }

  zoomAtScreenPoint(nextZoom: number, screen: Point, viewport: Size): void {
    this.state = zoomAtPointer(this.state, screen, viewport, nextZoom);
    this.notify();
  }

  panByScreenDelta(dx: number, dy: number): void {
    this.state = panByScreenDelta(this.state, dx, dy);
    this.notify();
  }

  centerOn(world: Point): void {
    this.state = { ...this.state, x: world.x, y: world.y };
    this.notify();
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
