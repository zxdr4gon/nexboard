import type { Point } from '../model/geometry';

// Trailing exponential filter (spec section 23): S_i = S_(i-1) + a(R_i - S_(i-1)).
// Chosen over a symmetric moving average because it only looks backward,
// so it can run live during drawing without waiting for future points.
export class StreamlineFilter {
  private smoothed: Point | null = null;

  constructor(private readonly alpha: number = 0.5) {}

  reset(point: Point): Point {
    this.smoothed = { ...point };
    return this.smoothed;
  }

  next(raw: Point): Point {
    if (!this.smoothed) return this.reset(raw);
    this.smoothed = {
      x: this.smoothed.x + this.alpha * (raw.x - this.smoothed.x),
      y: this.smoothed.y + this.alpha * (raw.y - this.smoothed.y),
    };
    return this.smoothed;
  }
}
