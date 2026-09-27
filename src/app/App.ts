import { Camera } from '../camera/Camera';
import { CanvasManager } from '../canvas/CanvasManager';
import { RenderScheduler } from '../canvas/RenderScheduler';
import { CommandManager } from '../commands/CommandManager';
import { GroupCommand } from '../commands/GroupCommand';
import { ReorderCommand } from '../commands/ReorderCommand';
import { UngroupCommand } from '../commands/UngroupCommand';
import { WhiteboardDocument } from '../document/Document';
import { generateId } from '../document/ObjectId';
import { PointerInputController } from '../input/PointerInput';
import { WheelInputController } from '../input/WheelInput';
import { identityTransform } from '../model/defaults';
import type { GroupObject } from '../model/types';
import { Renderer } from '../renderer/Renderer';
import { SelectionManager } from '../selection/SelectionManager';
import { ThemeManager } from '../theme/ThemeManager';
import { ArrowTool } from '../tools/ArrowTool';
import { EllipseTool } from '../tools/EllipseTool';
import { HandTool } from '../tools/HandTool';
import { LassoTool } from '../tools/LassoTool';
import { LineTool } from '../tools/LineTool';
import { PenTool } from '../tools/PenTool';
import { PolygonTool } from '../tools/PolygonTool';
import { RectangleTool } from '../tools/RectangleTool';
import { SelectTool } from '../tools/SelectTool';
import type { ToolContext, ToolId } from '../tools/Tool';
import { ToolManager } from '../tools/ToolManager';
import { TriangleTool } from '../tools/TriangleTool';
import { ObservableValue } from './appState';

export interface AppElements {
  canvas: HTMLCanvasElement;
  hudCoords: HTMLElement;
  hudZoom: HTMLElement;
  themeToggle: HTMLButtonElement;
  snapToggle: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  toolButtons: NodeListOf<HTMLButtonElement>;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');

function isPrimaryModifier(e: KeyboardEvent): boolean {
  return isMac ? e.metaKey : e.ctrlKey;
}

// Wires every subsystem together — camera/canvas/theme/document (Phase 1)
// plus commands/selection/tools (Phase 2). This is still the only place
// that knows about all of them at once; every other module only knows
// about the interfaces it directly depends on.
export class App {
  private canvasManager: CanvasManager;
  private camera = new Camera();
  private theme = new ThemeManager();
  private document = new WhiteboardDocument();
  private commands = new CommandManager();
  private selection = new SelectionManager();
  private renderer = new Renderer();
  private scheduler: RenderScheduler;
  private toolManager: ToolManager;
  private gridSnapEnabled = false;
  readonly activeTool = new ObservableValue<ToolId>('select');

  constructor(private elements: AppElements) {
    this.canvasManager = new CanvasManager(elements.canvas);

    const tools = [
      new SelectTool(),
      new LassoTool(),
      new PenTool(),
      new HandTool(),
      new RectangleTool(),
      new EllipseTool(),
      new TriangleTool(),
      new LineTool(),
      new ArrowTool(),
      new PolygonTool(),
    ];
    this.toolManager = new ToolManager(tools, 'select');
    this.scheduler = new RenderScheduler(() => this.draw());

    this.theme.init();
    this.theme.onChange(() => this.requestRender());
    this.canvasManager.onResize(() => this.requestRender());
    this.camera.onChange(() => this.requestRender());
    this.selection.onChange(() => this.requestRender());
    this.commands.onChange(() => {
      this.updateUndoRedoButtons();
      this.requestRender();
    });

    new PointerInputController(elements.canvas, this.camera, () => this.canvasManager.getViewportSize(), {
      onDown: (e) => this.toolManager.pointerDown(this.toolContext(), e),
      onMove: (e) => {
        this.updateHudCoords(e.worldX, e.worldY);
        this.toolManager.pointerMove(this.toolContext(), e);
      },
      onUp: (e) => this.toolManager.pointerUp(this.toolContext(), e),
    });

    new WheelInputController(elements.canvas, this.camera, () => this.canvasManager.getViewportSize());

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.wireToolbar();
    this.updateUndoRedoButtons();
    this.updateHudZoom();
    this.requestRender();
  }

  exportProjectJson(): string {
    return JSON.stringify(this.document.serialize(), null, 2);
  }

  private toolContext(): ToolContext {
    return {
      document: this.document,
      camera: this.camera,
      theme: this.theme,
      commands: this.commands,
      selection: this.selection,
      snapSettings: { grid: this.gridSnapEnabled },
      getViewport: () => this.canvasManager.getViewportSize(),
      requestRender: () => this.requestRender(),
    };
  }

  private wireToolbar(): void {
    this.elements.themeToggle.addEventListener('click', () => {
      const next = this.theme.getResolvedMode() === 'light' ? 'dark' : 'light';
      this.theme.setMode(next);
    });

    this.elements.snapToggle.addEventListener('click', () => {
      this.gridSnapEnabled = !this.gridSnapEnabled;
      this.elements.snapToggle.classList.toggle('is-active', this.gridSnapEnabled);
    });

    this.elements.undoButton.addEventListener('click', () => this.commands.undo());
    this.elements.redoButton.addEventListener('click', () => this.commands.redo());

    this.elements.toolButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.tool as ToolId;
        this.toolManager.active.cancel?.(this.toolContext());
        this.toolManager.setActive(id);
        this.activeTool.set(id);
        this.elements.toolButtons.forEach((b) => b.classList.toggle('is-active', b === button));
        this.requestRender();
      });
    });
  }

  private updateUndoRedoButtons(): void {
    this.elements.undoButton.disabled = !this.commands.canUndo();
    this.elements.redoButton.disabled = !this.commands.canRedo();
  }

  private updateHudCoords(worldX: number, worldY: number): void {
    this.elements.hudCoords.textContent = `x ${worldX.toFixed(1)}, y ${worldY.toFixed(1)}`;
  }

  private updateHudZoom(): void {
    this.elements.hudZoom.textContent = `${Math.round(this.camera.state.zoom * 100)}%`;
  }

  private requestRender(): void {
    this.updateHudZoom();
    this.renderer.setToolPreview(this.toolManager.active.getPreview?.() ?? null);
    const select = this.toolManager.active;
    if (select instanceof SelectTool) {
      this.renderer.setOverlay(select.getOverlay(this.toolContext()));
    } else {
      this.renderer.setOverlay(null);
    }
    this.scheduler.requestFrame();
  }

  private draw(): void {
    this.renderer.render(this.canvasManager, this.camera, this.document, this.theme);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    const primary = isPrimaryModifier(e);

    if (primary && e.key.toLowerCase() === 'z' && e.shiftKey) {
      e.preventDefault();
      this.commands.redo();
      return;
    }
    if (primary && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      this.commands.undo();
      return;
    }
    if (primary && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.commands.redo();
      return;
    }
    if (primary && e.key.toLowerCase() === 'g' && e.shiftKey) {
      e.preventDefault();
      this.ungroupSelection();
      return;
    }
    if (primary && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      this.groupSelection();
      return;
    }
    if (primary && e.key === ']' && e.shiftKey) {
      e.preventDefault();
      this.reorderSelection('front');
      return;
    }
    if (primary && e.key === '[' && e.shiftKey) {
      e.preventDefault();
      this.reorderSelection('back');
      return;
    }
    if (primary && e.key === ']') {
      e.preventDefault();
      this.reorderSelection('forward');
      return;
    }
    if (primary && e.key === '[') {
      e.preventDefault();
      this.reorderSelection('backward');
      return;
    }

    // Delete/Enter/Escape etc. are handled per-tool (SelectTool deletes
    // its selection; PolygonTool finishes/cancels its draft) so the
    // meaning of a key depends on what's active, without App needing to
    // know each tool's internal state.
    this.toolManager.active.onKeyDown?.(this.toolContext(), e);
  }

  private groupSelection(): void {
    const objects = this.selection.getObjects(this.document);
    if (objects.length < 2 || objects.some((o) => o.type === 'group')) return; // single-level grouping only (see README)
    const group: GroupObject = {
      id: generateId('group'),
      type: 'group',
      layerId: this.document.defaultLayerId,
      parentId: null,
      visible: true,
      locked: false,
      opacity: 1,
      transform: identityTransform(),
      childIds: objects.map((o) => o.id),
      style: {},
    };
    this.commands.execute(new GroupCommand(this.document, group.childIds, group));
    this.selection.set([group.id]);
  }

  private ungroupSelection(): void {
    const groups = this.selection.getObjects(this.document).filter((o) => o.type === 'group') as GroupObject[];
    if (groups.length === 0) return;
    const allChildIds: string[] = [];
    for (const group of groups) {
      this.commands.execute(new UngroupCommand(this.document, group));
      allChildIds.push(...group.childIds);
    }
    this.selection.set(allChildIds);
  }

  private reorderSelection(direction: 'forward' | 'backward' | 'front' | 'back'): void {
    const ids = this.selection.getIds();
    if (ids.length !== 1) return; // multi-select reordering isn't supported in Phase 2 (see README)
    const object = this.document.getObject(ids[0]);
    if (!object) return;
    const layer = this.document.getLayerById(object.layerId);
    if (!layer) return;
    const fromIndex = this.document.getTopLevelIndex(object.layerId, object.id);
    if (fromIndex < 0) return;
    let toIndex = fromIndex;
    if (direction === 'forward') toIndex = fromIndex + 1;
    else if (direction === 'backward') toIndex = fromIndex - 1;
    else if (direction === 'front') toIndex = layer.objectIds.length - 1;
    else toIndex = 0;
    if (toIndex === fromIndex) return;
    this.commands.execute(new ReorderCommand(this.document, object.layerId, object.id, fromIndex, toIndex));
  }
}
