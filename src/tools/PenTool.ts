import { generateId } from '../document/ObjectId';
import type { NormalizedPointerEvent } from '../input/NormalizedEvents';
import type { StrokeObject, StrokePoint } from '../model/types';
import { StreamlineFilter } from '../smoothing/Streamline';
import { semanticColor } from '../theme/ColorResolver';
import type { Tool, ToolContext } from './Tool';

const STREAMLINE_ALPHA = 0.5;
const MIN_DISTANCE = 1.5; // world units between recorded points
const DEFAULT_WIDTH = 3;

export class PenTool implements Tool {
  readonly id = 'pen' as const;

  private points: StrokePoint[] = [];
  private filter = new StreamlineFilter(STREAMLINE_ALPHA);
  private lastRecorded: { x: number; y: number } | null = null;
  private drawing = false;

  pointerDown(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (e.buttons !== 1) return;
    this.drawing = true;
    this.points = [];
    const start = this.filter.reset({ x: e.worldX, y: e.worldY });
    this.record(start, e);
    ctx.requestRender();
  }

  pointerMove(ctx: ToolContext, e: NormalizedPointerEvent): void {
    if (!this.drawing) return;
    const smoothed = this.filter.next({ x: e.worldX, y: e.worldY });
    if (this.shouldRecord(smoothed)) {
      this.record(smoothed, e);
      ctx.requestRender();
    }
  }

  pointerUp(ctx: ToolContext): void {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.points.length < 2) {
      this.points = [];
      return;
    }
    const stroke: StrokeObject = {
      id: generateId('stroke'),
      type: 'stroke',
      layerId: ctx.document.defaultLayerId,
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
    ctx.document.addObject(stroke);
    this.points = [];
    this.lastRecorded = null;
    ctx.requestRender();
  }

  cancel(): void {
    this.drawing = false;
    this.points = [];
    this.lastRecorded = null;
  }

  /** Exposed so the renderer can preview the in-progress stroke live. */
  getPreviewPoints(): StrokePoint[] {
    return this.points;
  }

  getPreviewWidth(): number {
    return DEFAULT_WIDTH;
  }

  isDrawing(): boolean {
    return this.drawing;
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
}
