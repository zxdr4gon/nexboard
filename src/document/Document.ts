import type { DocumentSettings, Layer, WhiteboardObject, WhiteboardProject } from '../model/types';
import { createEmptyProject } from './DocumentFactory';

type ChangeListener = () => void;

// Phase 1 document store: a thin wrapper around the serializable
// WhiteboardProject with direct mutation methods. This is intentionally
// NOT command-based yet — Phase 2 introduces CommandManager/undo-redo
// (spec section 59) and object mutation will route through commands at
// that point instead of addObject() mutating directly. Kept minimal on
// purpose so Phase 2 can slot in without reshaping the public API much:
// getObjects/getObject/getLayers/serialize all stay the same shape.
export class WhiteboardDocument {
  private project: WhiteboardProject;
  private listeners = new Set<ChangeListener>();

  constructor(project: WhiteboardProject = createEmptyProject()) {
    this.project = project;
  }

  get defaultLayerId(): string {
    return this.project.layers[0].id;
  }

  getObjects(): WhiteboardObject[] {
    return this.project.objects;
  }

  getObject(id: string): WhiteboardObject | undefined {
    return this.project.objects.find((object) => object.id === id);
  }

  getLayers(): Layer[] {
    return this.project.layers;
  }

  getSettings(): DocumentSettings {
    return this.project.settings;
  }

  addObject(object: WhiteboardObject): void {
    this.project.objects.push(object);
    const layer = this.project.layers.find((l) => l.id === object.layerId);
    layer?.objectIds.push(object.id);
    this.touch();
  }

  serialize(): WhiteboardProject {
    return structuredClone(this.project);
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private touch(): void {
    this.project.updatedAt = new Date().toISOString();
    for (const listener of this.listeners) listener();
  }
}
