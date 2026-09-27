import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { Tool, ToolContext, ToolId } from './Tool';

export class ToolManager {
  private tools = new Map<ToolId, Tool>();
  private activeId: ToolId;

  constructor(tools: Tool[], defaultToolId: ToolId) {
    for (const tool of tools) this.tools.set(tool.id, tool);
    this.activeId = defaultToolId;
  }

  get active(): Tool {
    const tool = this.tools.get(this.activeId);
    if (!tool) throw new Error(`Unknown tool: ${this.activeId}`);
    return tool;
  }

  // Cancelling the outgoing tool's in-progress gesture needs a
  // ToolContext, which ToolManager doesn't hold — App does this itself
  // (active.cancel?.(ctx)) immediately before calling setActive(), so a
  // half-drawn polygon or in-progress drag is discarded cleanly on
  // every tool switch.
  setActive(id: ToolId): void {
    this.activeId = id;
  }

  pointerDown(ctx: ToolContext, e: NormalizedPointerEvent): void {
    this.active.pointerDown(ctx, e);
  }

  pointerMove(ctx: ToolContext, e: NormalizedPointerEvent): void {
    this.active.pointerMove(ctx, e);
  }

  pointerUp(ctx: ToolContext, e: NormalizedPointerEvent): void {
    this.active.pointerUp(ctx, e);
  }
}
