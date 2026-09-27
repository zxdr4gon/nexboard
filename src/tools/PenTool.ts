import { AddObjectsCommand } from '../commands/AddObjectsCommand';
import { generateId } from '../document/ObjectId';
import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { StrokeObject, StrokePoint } from '../model/types';
import { createObjectFromRecognizedShape, recognizeStroke, type RecognizedShape } from '../recognition/ShapeRecognizer';
import { StreamlineFilter } from '../smoothing/Streamline';
import { semanticColor } from '../theme/ColorResolver';
import type { Tool, ToolContext, ToolPreview } from './Tool';

const STREAMLINE_ALPHA = 0.5;
const MIN_DISTANCE = 1.5; // world units between recorded points
const DEFAULT_WIDTH = 3;

// Hold-to-snap dwell parameters (spec sections 31-32): screen-space,
// per that section's own recommendation ("a screen-space stability
// check is often more intuitive for the dwell detector").
const HOLD_RADIUS_PX = 6;
const HOLD_DURATION_MS = 260;

export class PenTool implements Tool {
  readonly id = 'pen' as const;

  private points: StrokePoint[] = [];
  private filter = new StreamlineFilter(STREAMLINE_ALPHA);
  private lastRecorded: { x: number; y: number } | null = null;
  private drawing = false;

  private holdAnchor: { x: number; y: number } | null = null;
  private holdStartTime: number | null = null;
  private pendingShape: RecognizedShape | null = null;

  pointerDown(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (e.buttons !== 1) return;
    this.drawing = true;
    this.points = [];
    this.holdAnchor = null;
    this.holdStartTime = null;
    this.pendingShape = null;
    const start = this.filter.reset({ x: e.worldX, y: e.worldY });
    this.record(start, e);
    ctx.requestRender();
  }

  pointerMove(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (!this.drawing) return;
    const smoothed = this.filter.next({ x: e.worldX, y: e.worldY });
    if (this.shouldRecord(smoothed)) {
      this.record(smoothed, e);
    }
    this.updateHoldState(e);
    ctx.requestRender();
  }

  pointerUp(ctx: ToolContext): void {
    if (!this.drawing) return;
    this.drawing = false;

    if (this.pendingShape) {
      const object = createObjectFromRecognizedShape(this.pendingShape, ctx.document.defaultLayerId);
      ctx.commands.execute(new AddObjectsCommand(ctx.document, [object], 'Draw shape'));
      this.reset();
      ctx.requestRender();
      return;
    }

    if (this.points.length < 2) {
      this.reset();
      return;
    }
    const stroke: StrokeObject = {
      id: generateId('stroke'),
      type: 'stroke',
      layerId: ctx.document.defaultLayerId,
      parentId: null,
      visible: true,
      locked: false,
      opacity: 1,
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      style: {},
      tool: 'pen',
      points: this.points,
      width: DEFAULT_WIDTH,
      smoothing: { streamline: STREAMLINE_ALPHA, simplifyTolerance: 0.5 },
      brushSettings: { opacity: 1, pressureEnabled: true },
      color: semanticColor('ink-primary'),
    };
    ctx.commands.execute(new AddObjectsCommand(ctx.document, [stroke], 'Draw stroke'));
    this.reset();
    ctx.requestRender();
  }

  cancel(): void {
    this.drawing = false;
    this.reset();
  }

  getPreview(): ToolPreview | null {
    if (this.pendingShape) {
      const draft = createObjectFromRecognizedShape(this.pendingShape, 'preview');
      return { kind: 'object', object: draft };
    }
    if (this.drawing) {
      return { kind: 'stroke', points: this.points, width: DEFAULT_WIDTH };
    }
    return null;
  }

  isDrawing(): boolean {
    return this.drawing;
  }

  private reset(): void {
    this.points = [];
    this.lastRecorded = null;
    this.holdAnchor = null;
    this.holdStartTime = null;
    this.pendingShape = null;
  }

  private shouldRecord(point: { x: number; y: number }): boolean {
    if (!this.lastRecorded) return true;
    const dx = point.x - this.lastRecorded.x;
    const dy = point.y - this.lastRecorded.y;
    return dx * dx + dy * dy >= MIN_DISTANCE * MIN_DISTANCE;
  }

  private record(point: { x: number; y: number }, e: NormalizedPointerEvent): void {
    this.lastRecorded = point;
    this.points.push({ x: point.x, y: point.y, pressure: e.pressure, time: e.timestamp });
  }

  /** DRAWING -> POSSIBLE_HOLD -> SNAP_CANDIDATE state machine (spec section 31). */
  private updateHoldState(e: NormalizedPointerEvent): void {
    const now = e.timestamp;
    if (!this.holdAnchor) {
      this.holdAnchor = { x: e.screenX, y: e.screenY };
      this.holdStartTime = now;
      return;
    }
    const displacement = Math.hypot(e.screenX - this.holdAnchor.x, e.screenY - this.holdAnchor.y);
    if (displacement > HOLD_RADIUS_PX) {
      // Moved significantly -> back to DRAWING.
      this.holdAnchor = { x: e.screenX, y: e.screenY };
      this.holdStartTime = now;
      this.pendingShape = null;
      return;
    }
    if (this.holdStartTime !== null && !this.pendingShape && now - this.holdStartTime >= HOLD_DURATION_MS) {
      this.pendingShape = recognizeStroke(this.points);
    }
  }
}
