// Spec section 17: size the backing buffer at CSS-size * DPR, keep the
// CSS box at the logical size, and never apply DPR a second time
// elsewhere (see Renderer, which folds DPR into a single setTransform).
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): boolean {
  const targetWidth = Math.max(1, Math.round(cssWidth * dpr));
  const targetHeight = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    return true;
  }
  return false;
}
