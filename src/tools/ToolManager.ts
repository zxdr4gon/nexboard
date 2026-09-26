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

  // NOTE: does not call the outgoing tool's cancel() — that needs a
  // ToolContext, which ToolManager doesn't hold. Today this is harmless
  // (PenTool/HandTool only hold local gesture state, cleared on their
  // own pointerup), but once a tool's cancel() needs to touch the
  // document (e.g. discarding a half-drawn shape), route tool switching
  // through App so it can supply the context.
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
