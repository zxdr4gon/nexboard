// Coalesces multiple render requests within a frame into a single
// requestAnimationFrame callback (spec section 5.7 / 82).
export class RenderScheduler {
  private frameRequested = false;
  private rafHandle: number | null = null;

  constructor(private readonly renderFn: () => void) {}

  requestFrame(): void {
    if (this.frameRequested) return;
    this.frameRequested = true;
    this.rafHandle = requestAnimationFrame(() => {
      this.frameRequested = false;
      this.renderFn();
    });
  }

  dispose(): void {
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
  }
}
