import { describe, expect, it } from 'vitest';
import { recognizeStroke } from '../../src/recognition/ShapeRecognizer';
import type { StrokePoint } from '../../src/model/types';

function pt(x: number, y: number): StrokePoint {
  return { x, y };
}

describe('ShapeRecognizer', () => {
  it('recognizes a straight drag as a line', () => {
    const points: StrokePoint[] = [];
    for (let i = 0; i <= 10; i++) points.push(pt(i * 10, i * 10));
    const result = recognizeStroke(points);
    expect(result?.kind).toBe('line');
  });

  it('recognizes a closed circular gesture as an ellipse', () => {
    const points: StrokePoint[] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      points.push(pt(100 + Math.cos(angle) * 50, 100 + Math.sin(angle) * 50));
    }
    const result = recognizeStroke(points);
    expect(result?.kind).toBe('ellipse');
  });

  it('recognizes a closed 4-corner gesture as a rectangle', () => {
    const corners = [
      [0, 0],
      [100, 0],
      [100, 60],
      [0, 60],
      [0, 0],
    ];
    const points: StrokePoint[] = [];
    for (let i = 0; i < corners.length - 1; i++) {
      const [x0, y0] = corners[i];
      const [x1, y1] = corners[i + 1];
      for (let t = 0; t <= 5; t++) {
        points.push(pt(x0 + ((x1 - x0) * t) / 5, y0 + ((y1 - y0) * t) / 5));
      }
    }
    const result = recognizeStroke(points);
    expect(result?.kind).toBe('rectangle');
  });

  it('does not recognize a short scribble as any shape', () => {
    const points: StrokePoint[] = [pt(0, 0), pt(2, 1), pt(1, 3)];
    const result = recognizeStroke(points);
    expect(result).toBeNull();
  });
});
