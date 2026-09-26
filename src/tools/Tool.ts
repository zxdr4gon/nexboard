import type { Camera } from '../camera/Camera';
import type { WhiteboardDocument } from '../document/Document';
import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { Size } from '../model/geometry';
import type { ThemeManager } from '../theme/ThemeManager';

export type ToolId = 'pen' | 'hand';

export interface ToolContext {
  document: WhiteboardDocument;
  camera: Camera;
  theme: ThemeManager;
  getViewport: () => Size;
  requestRender: () => void;
}

// Matches the extensible Tool interface from spec section 1.1: adding a
// new tool means implementing this interface and registering it with
// ToolManager, without touching the input controller or renderer.
export interface Tool {
  id: ToolId;
  pointerDown(ctx: ToolContext, event: NormalizedPointerEvent): void;
  pointerMove(ctx: ToolContext, event: NormalizedPointerEvent): void;
  pointerUp(ctx: ToolContext, event: NormalizedPointerEvent): void;
  cancel?(ctx: ToolContext): void;
}
