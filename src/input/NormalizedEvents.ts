// Spec section 21. Note: `screenX/screenY` here are canvas-relative
// coordinates (matching the sx/sy used throughout the section 15
// coordinate-conversion math) — NOT the native PointerEvent.screenX,
// which is relative to the physical monitor. clientX/clientY are kept
// as the raw viewport-relative values for anything that needs them.
export interface NormalizedPointerEvent {
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch';
  buttons: number;
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  timestamp: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}
