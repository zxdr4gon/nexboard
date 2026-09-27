import { describe, expect, it } from 'vitest';
import { getObjectBounds, getUnionBounds, rotateObjectAroundPivot, scaleObjectAroundPivot, translateObject } from '../../src/selection/ObjectGeometry';
import { defaultFill, defaultStrokeStyle, identityTransform } from '../../src/model/defaults';
import type { RectangleObject } from '../../src/model/types';

function makeRect(): RectangleObject {
  return {
    id: 'r1',
    type: 'rectangle',
    layerId: 'l1',
    parentId: null,
    visible: true,
    locked: false,
    opacity: 1,
    transform: identityTransform(100, 100),
    width: 40,
    height: 20,
    radius: 0,
    fill: defaultFill(),
    stroke: defaultStrokeStyle(),
    style: {},
  };
}

describe('ObjectGeometry', () => {
  it('translateObject moves the bounds by the given delta', () => {
    const rect = makeRect();
    const before = getObjectBounds(rect);
    const moved = translateObject(rect, 10, -5);
    const after = getObjectBounds(moved);
    expect(after.minX).toBeCloseTo(before.minX + 10, 6);
    expect(after.minY).toBeCloseTo(before.minY - 5, 6);
  });

  it('rotateObjectAroundPivot around its own center keeps bounds centered', () => {
    const rect = makeRect();
    const center = { x: rect.transform.x, y: rect.transform.y };
    const rotated = rotateObjectAroundPivot(rect, center, Math.PI / 2);
    expect(rotated.transform.x).toBeCloseTo(center.x, 6);
    expect(rotated.transform.y).toBeCloseTo(center.y, 6);
    expect(rotated.transform.rotation).toBeCloseTo(Math.PI / 2, 6);
  });

  it('rotateObjectAroundPivot around a remote pivot orbits the object', () => {
    const rect = makeRect(); // center at (100, 100)
    const pivot = { x: 0, y: 0 };
    const rotated = rotateObjectAroundPivot(rect, pivot, Math.PI / 2);
    // 90 degrees CW around origin: (100,100) -> (-100, 100)
    expect(rotated.transform.x).toBeCloseTo(-100, 5);
    expect(rotated.transform.y).toBeCloseTo(100, 5);
  });

  it('scaleObjectAroundPivot doubles size when scaling 2x from its own center', () => {
    const rect = makeRect();
    const center = { x: rect.transform.x, y: rect.transform.y };
    const scaled = scaleObjectAroundPivot(rect, center, 2, 2);
    expect(scaled.width).toBeCloseTo(80, 6);
    expect(scaled.height).toBeCloseTo(40, 6);
    expect(scaled.transform.x).toBeCloseTo(center.x, 6);
  });
});

describe('resolveToLeafObjects (group bounds regression)', () => {
  it('resolves a selected group to its children instead of a degenerate empty box', async () => {
    const { WhiteboardDocument } = await import('../../src/document/Document');
    const { createEmptyProject } = await import('../../src/document/DocumentFactory');
    const { resolveToLeafObjects } = await import('../../src/selection/ObjectGeometry');

    const project = createEmptyProject();
    const document = new WhiteboardDocument(project);
    const layerId = document.defaultLayerId;

    const rectA: RectangleObject = { ...makeRect(), id: 'a', layerId, transform: identityTransform(0, 0) };
    const rectB: RectangleObject = { ...makeRect(), id: 'b', layerId, transform: identityTransform(200, 200) };
    document.addObjects([rectA, rectB]);
    document.groupObjects(['a', 'b'], {
      id: 'g1',
      type: 'group',
      layerId,
      parentId: null,
      visible: true,
      locked: false,
      opacity: 1,
      transform: identityTransform(),
      childIds: ['a', 'b'],
      style: {},
    });

    const group = document.getObject('g1')!;
    const resolved = resolveToLeafObjects(document, [group]);
    expect(resolved.map((o) => o.id).sort()).toEqual(['a', 'b']);

    const bounds = getUnionBounds(resolved)!;
    // rectA centered at (0,0) 40x20, rectB centered at (200,200) 40x20 -> union should span both.
    expect(bounds.minX).toBeLessThan(0);
    expect(bounds.maxX).toBeGreaterThan(200);
  });
});
