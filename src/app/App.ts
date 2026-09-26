import { Camera } from '../camera/Camera';
import { CanvasManager } from '../canvas/CanvasManager';
import { RenderScheduler } from '../canvas/RenderScheduler';
import { WhiteboardDocument } from '../document/Document';
import { PointerInputController } from '../input/PointerInput';
import { WheelInputController } from '../input/WheelInput';
import { Renderer } from '../renderer/Renderer';
import { ThemeManager } from '../theme/ThemeManager';
import { HandTool } from '../tools/HandTool';
import { PenTool } from '../tools/PenTool';
import type { ToolContext, ToolId } from '../tools/Tool';
import { ToolManager } from '../tools/ToolManager';
import { ObservableValue } from './appState';

export interface AppElements {
  canvas: HTMLCanvasElement;
  hudCoords: HTMLElement;
  hudZoom: HTMLElement;
  themeToggle: HTMLButtonElement;
  toolButtons: NodeListOf<HTMLButtonElement>;
}

// Wires every Phase 1 subsystem together. This is the only place that
// knows about all of them at once — tools, renderer, camera, document,
// and theme all stay independent of each other and only talk through
// the interfaces defined in their own modules.
export class App {
  private canvasManager: CanvasManager;
  private camera = new Camera();
  private theme = new ThemeManager();
  private document = new WhiteboardDocument();
  private renderer = new Renderer();
  private scheduler: RenderScheduler;
  private penTool = new PenTool();
  private toolManager: ToolManager;
  readonly activeTool = new ObservableValue<ToolId>('pen');

  constructor(private elements: AppElements) {
    this.canvasManager = new CanvasManager(elements.canvas);
    this.toolManager = new ToolManager([this.penTool, new HandTool()], 'pen');
    this.scheduler = new RenderScheduler(() => this.draw());

    this.theme.init();
    this.theme.onChange(() => this.requestRender());
    this.canvasManager.onResize(() => this.requestRender());
    this.camera.onChange(() => this.requestRender());

    new PointerInputController(elements.canvas, this.camera, () => this.canvasManager.getViewportSize(), {
      onDown: (e) => this.toolManager.pointerDown(this.toolContext(), e),
      onMove: (e) => {
        this.updateHudCoords(e.worldX, e.worldY);
        this.toolManager.pointerMove(this.toolContext(), e);
      },
      onUp: (e) => this.toolManager.pointerUp(this.toolContext(), e),
    });

    new WheelInputController(elements.canvas, this.camera, () => this.canvasManager.getViewportSize());

    this.wireToolbar();
    this.updateHudZoom();
    this.requestRender();
  }

  /** Current in-memory project as a WhiteboardProject JSON string (spec section 6). */
  exportProjectJson(): string {
    return JSON.stringify(this.document.serialize(), null, 2);
  }

  private toolContext(): ToolContext {
    return {
      document: this.document,
      camera: this.camera,
      theme: this.theme,
      getViewport: () => this.canvasManager.getViewportSize(),
      requestRender: () => this.requestRender(),
    };
  }

  private wireToolbar(): void {
    this.elements.themeToggle.addEventListener('click', () => {
      const next = this.theme.getResolvedMode() === 'light' ? 'dark' : 'light';
      this.theme.setMode(next);
    });

    this.elements.toolButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.tool as ToolId;
        this.toolManager.setActive(id);
        this.activeTool.set(id);
        this.elements.toolButtons.forEach((b) => b.classList.toggle('is-active', b === button));
      });
    });
  }

  private updateHudCoords(worldX: number, worldY: number): void {
    this.elements.hudCoords.textContent = `x ${worldX.toFixed(1)}, y ${worldY.toFixed(1)}`;
  }

  private updateHudZoom(): void {
    this.elements.hudZoom.textContent = `${Math.round(this.camera.state.zoom * 100)}%`;
  }

  private requestRender(): void {
    this.updateHudZoom();
    this.renderer.setPreviewStroke(
      this.penTool.isDrawing()
        ? { points: this.penTool.getPreviewPoints(), width: this.penTool.getPreviewWidth() }
        : null,
    );
    this.scheduler.requestFrame();
  }

  private draw(): void {
    this.renderer.render(this.canvasManager, this.camera, this.document, this.theme);
  }
}
