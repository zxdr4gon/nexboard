import { semanticColor } from '../theme/ColorResolver';
import type { Paint, StrokeStyle, Transform } from './types';

export function defaultStrokeStyle(width = 2): StrokeStyle {
  return {
    color: semanticColor('ink-primary'),
    width,
    cap: 'round',
    join: 'round',
    opacity: 1,
  };
}

export function defaultFill(): Paint {
  return { type: 'none' };
}

export function identityTransform(x = 0, y = 0): Transform {
  return { x, y, rotation: 0, scaleX: 1, scaleY: 1 };
}
