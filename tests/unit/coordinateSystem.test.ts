import { describe, expect, it } from 'vitest';
import {
  panByScreenDelta,
  screenToWorld,
  worldToScreen,
  zoomAtPointer,
} from '../../src/camera/CoordinateSystem';

const viewport = { width: 800, height: 600 };

describe('coordinate conversion', () => {
  it('round-trips screen -> world -> screen', () => {
    const camera = { x: 120, y: -40, zoom: 2 };
    const screen = { x: 300, y: 150 };
    const world = screenToWorld(camera, screen, viewport);
    const back = worldToScreen(camera, world, viewport);
    expect(back.x).toBeCloseTo(screen.x, 6);
    expect(back.y).toBeCloseTo(screen.y, 6);
  });

  it('keeps the point under the cursor fixed when zooming (zoom-to-cursor)', () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    const screen = { x: 550, y: 220 };
    const worldBefore = screenToWorld(camera, screen, viewport);
    const nextCamera = zoomAtPointer(camera, screen, viewport, 3);
    const worldAfter = screenToWorld(nextCamera, screen, viewport);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6);
  });

  it('holds zoom-to-cursor at an off-center, non-unit-zoom starting point', () => {
    const camera = { x: 55, y: -230, zoom: 4.2 };
    const screen = { x: 12, y: 588 };
    const worldBefore = screenToWorld(camera, screen, viewport);
    const nextCamera = zoomAtPointer(camera, screen, viewport, 0.7);
    const worldAfter = screenToWorld(nextCamera, screen, viewport);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6);
  });

  it('clamps zoom to the configured min/max range', () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    const zoomedOut = zoomAtPointer(camera, { x: 0, y: 0 }, viewport, 0.0000001);
    const zoomedIn = zoomAtPointer(camera, { x: 0, y: 0 }, viewport, 100000);
    expect(zoomedOut.zoom).toBeGreaterThan(0);
    expect(zoomedIn.zoom).toBeLessThan(100000);
  });

  it('pans using the documented sign convention', () => {
    const camera = { x: 0, y: 0, zoom: 2 };
    // Dragging the paper right (+dx) moves the camera left through the world.
    const panned = panByScreenDelta(camera, 20, -10);
    expect(panned.x).toBeCloseTo(-10, 6);
    expect(panned.y).toBeCloseTo(5, 6);
  });
});
