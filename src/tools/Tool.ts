import type { Camera } from '../camera/Camera';
import type { CommandManager } from '../commands/CommandManager';
import type { WhiteboardDocument } from '../document/Document';
import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { Size } from '../model/geometry';
import type { WhiteboardObject } from '../model/types';
import type { SelectionManager } from '../selection/SelectionManager';
import type { ThemeManager } from '../theme/ThemeManager';

export type ToolId = 'select' | 'lasso' | 'pen' | 'hand' | 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'arrow' | 'polygon';

export interface SnapSettings {
  grid: boolean;
}

export interface ToolContext {
  document: WhiteboardDocument;
  camera: Camera;
  theme: ThemeManager;
  commands: CommandManager;
  selection: SelectionManager;
  snapSettings: SnapSettings;
  getViewport: () => Size;
  requestRender: () => void;
}

/** A live, uncommitted preview shown by Renderer while a tool is mid-gesture (drag-to-create, hold-to-snap, polygon-in-progress). */
export type ToolPreview =
  | { kind: 'stroke'; points: { x: number; y: number }[]; width: number }
  | { kind: 'object'; object: WhiteboardObject };

export interface Tool {
  id: ToolId;
  pointerDown(ctx: ToolContext, event: NormalizedPointerEvent): void;
  pointerMove(ctx: ToolContext, event: NormalizedPointerEvent): void;
  pointerUp(ctx: ToolContext, event: NormalizedPointerEvent): void;
  cancel?(ctx: ToolContext): void;
  onKeyDown?(ctx: ToolContext, event: KeyboardEvent): void;
  getPreview?(): ToolPreview | null;
}
