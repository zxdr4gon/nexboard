import { generateId } from '../document/ObjectId';
import { defaultStrokeStyle, identityTransform } from '../model/defaults';
import type { Point } from '../model/geometry';
import type { WhiteboardObject } from '../model/types';
import { snapAngle } from '../selection/SnapManager';
import { DragToCreateTool } from './support/DragToCreateTool';

export class LineTool extends DragToCreateTool {
  readonly id = 'line' as const;

  protected minDragWorld(): number {
    return 2;
  }

  protected label(): string {
    return 'Draw line';
  }

  protected buildObject(anchor: Point, current: Point, shiftKey: boolean, _altKey: boolean, layerId: string): WhiteboardObject | null {
    let end = current;
    if (shiftKey) {
      const dx = current.x - anchor.x;
      const dy = current.y - anchor.y;
      const angle = snapAngle(Math.atan2(dy, dx));
      const len = Math.hypot(dx, dy);
      end = { x: anchor.x + len * Math.cos(angle), y: anchor.y + len * Math.sin(angle) };
    }
    if (Math.hypot(end.x - anchor.x, end.y - anchor.y) < this.minDragWorld()) return null;
    return {
      id: generateId('line'),
      type: 'line',
      layerId,
      parentId: null,
      visible: true,
      locked: false,
      opacity: 1,
      transform: identityTransform(),
      start: anchor,
      end,
      stroke: defaultStrokeStyle(),
      style: {},
    };
  }
}
