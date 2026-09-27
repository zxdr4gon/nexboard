import { generateId } from '../document/ObjectId';
import { defaultFill, defaultStrokeStyle, identityTransform } from '../model/defaults';
import type { Point } from '../model/geometry';
import type { WhiteboardObject } from '../model/types';
import { DragToCreateTool } from './support/DragToCreateTool';

export class RectangleTool extends DragToCreateTool {
  readonly id = 'rectangle' as const;

  protected label(): string {
    return 'Draw rectangle';
  }

  protected buildObject(anchor: Point, current: Point, shiftKey: boolean, altKey: boolean, layerId: string): WhiteboardObject | null {
    const { cx, cy, halfW, halfH } = this.computeBoxFromDrag(anchor, current, shiftKey, altKey);
    if (halfW < 0.5 || halfH < 0.5) return null;
    return {
      id: generateId('rectangle'),
      type: 'rectangle',
      layerId,
      parentId: null,
      visible: true,
      locked: false,
      opacity: 1,
      transform: identityTransform(cx, cy),
      width: halfW * 2,
      height: halfH * 2,
      radius: 0,
      fill: defaultFill(),
      stroke: defaultStrokeStyle(),
      style: {},
    };
  }
}
