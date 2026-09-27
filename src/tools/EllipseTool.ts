import { generateId } from '../document/ObjectId';
import { defaultFill, defaultStrokeStyle, identityTransform } from '../model/defaults';
import type { Point } from '../model/geometry';
import type { WhiteboardObject } from '../model/types';
import { DragToCreateTool } from './support/DragToCreateTool';

export class EllipseTool extends DragToCreateTool {
  readonly id = 'ellipse' as const;

  protected label(): string {
    return 'Draw ellipse';
  }

  protected buildObject(anchor: Point, current: Point, shiftKey: boolean, altKey: boolean, layerId: string): WhiteboardObject | null {
    const { cx, cy, halfW, halfH } = this.computeBoxFromDrag(anchor, current, shiftKey, altKey);
    if (halfW < 0.5 || halfH < 0.5) return null;
    return {
      id: generateId('ellipse'),
      type: 'ellipse',
      layerId,
      parentId: null,
      visible: true,
      locked: false,
      opacity: 1,
      transform: identityTransform(cx, cy),
      radiusX: halfW,
      radiusY: halfH,
      fill: defaultFill(),
      stroke: defaultStrokeStyle(),
      style: {},
    };
  }
}
