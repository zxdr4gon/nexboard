import type { Camera } from '../camera/Camera';
import type { Size } from '../model/geometry';
import type { NormalizedPointerEvent } from './NormalizedEvents';

export type PointerHandler = (event: NormalizedPointerEvent) => void;

// Normalizes native PointerEvents (mouse/pen/touch all arrive through
// this one API) into NormalizedPointerEvent, and manages pointer
// capture during a gesture (spec section 21/142/143).
export class PointerInputController {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly getViewport: () => Size,
    private readonly handlers: {
      onDown: PointerHandler;
      onMove: PointerHandler;
      onUp: PointerHandler;
      onCancel?: PointerHandler;
    },
  ) {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.handleDown);
    canvas.addEventListener('pointermove', this.handleMove);
    canvas.addEventListener('pointerup', this.handleUp);
    canvas.addEventListener('pointercancel', this.handleCancel);
  }

  private toNormalized = (e: PointerEvent): NormalizedPointerEvent => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.camera.screenToWorld({ x: screenX, y: screenY }, this.getViewport());
    return {
      pointerId: e.pointerId,
      pointerType: (e.pointerType as NormalizedPointerEvent['pointerType']) || 'mouse',
      buttons: e.buttons,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX,
      screenY,
      worldX: world.x,
      worldY: world.y,
      pressure: e.pressure || 0.5,
      tiltX: e.tiltX ?? 0,
      tiltY: e.tiltY ?? 0,
      timestamp: e.timeStamp,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    };
  };

  private handleDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    this.handlers.onDown(this.toNormalized(e));
  };

  private handleMove = (e: PointerEvent): void => {
    this.handlers.onMove(this.toNormalized(e));
  };

  private handleUp = (e: PointerEvent): void => {
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    this.handlers.onUp(this.toNormalized(e));
  };

  private handleCancel = (e: PointerEvent): void => {
    this.handlers.onCancel?.(this.toNormalized(e));
  };

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handleDown);
    this.canvas.removeEventListener('pointermove', this.handleMove);
    this.canvas.removeEventListener('pointerup', this.handleUp);
    this.canvas.removeEventListener('pointercancel', this.handleCancel);
  }
}
