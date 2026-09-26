import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { Tool, ToolContext } from './Tool';

export class HandTool implements Tool {
  readonly id = 'hand' as const;

  private lastScreen: { x: number; y: number } | null = null;
  private panning = false;

  pointerDown(_ctx: ToolContext, e: NormalizedPointerEvent): void {
    this.panning = true;
    this.lastScreen = { x: e.screenX, y: e.screenY };
  }

  pointerMove(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (!this.panning || !this.lastScreen) return;
    const dx = e.screenX - this.lastScreen.x;
    const dy = e.screenY - this.lastScreen.y;
    ctx.camera.panByScreenDelta(dx, dy);
    this.lastScreen = { x: e.screenX, y: e.screenY };
  }

  pointerUp(): void {
    this.panning = false;
    this.lastScreen = null;
  }

  cancel(): void {
    this.panning = false;
    this.lastScreen = null;
  }
}
