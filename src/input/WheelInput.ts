import type { Camera } from '../camera/Camera';
import type { Size } from '../model/geometry';

// Trackpad pinch-zoom arrives as a wheel event with ctrlKey set (this is
// a real, if slightly odd, browser convention) — plain wheel/two-finger
// scroll pans instead. Both zoom and pan go through Camera so they use
// the same tested math as everything else.
export class WheelInputController {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly getViewport: () => Size,
  ) {
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (e.ctrlKey) {
      const zoomFactor = Math.exp(-e.deltaY * 0.01);
      const nextZoom = this.camera.state.zoom * zoomFactor;
      this.camera.zoomAtScreenPoint(nextZoom, screen, this.getViewport());
    } else {
      this.camera.panByScreenDelta(-e.deltaX, -e.deltaY);
    }
  };

  dispose(): void {
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }
}
