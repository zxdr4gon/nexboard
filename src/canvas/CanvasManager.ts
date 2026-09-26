import type { Size } from '../model/geometry';
import { getDevicePixelRatio, resizeCanvasToDisplaySize } from './DevicePixelRatio';

// Owns the canvas element and keeps its backing buffer in sync with its
// CSS box and the device pixel ratio. Rendering logic lives in Renderer;
// this class only knows about sizing.
export class CanvasManager {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver;
  private onResizeCallback?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context is not available.');
    this.ctx = ctx;
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.handleResize();
  }

  get dpr(): number {
    return getDevicePixelRatio();
  }

  getViewportSize(): Size {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  onResize(callback: () => void): void {
    this.onResizeCallback = callback;
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;
    resizeCanvasToDisplaySize(this.canvas, width, height, this.dpr);
    this.onResizeCallback?.();
  }

  dispose(): void {
    this.resizeObserver.disconnect();
  }
}
