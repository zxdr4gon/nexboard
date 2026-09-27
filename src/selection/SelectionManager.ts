import type { WhiteboardDocument } from '../document/Document';
import type { WhiteboardObject } from '../model/types';

type Listener = () => void;

/** Tracks which object ids are currently selected. Pure UI state — never serialized into the document. */
export class SelectionManager {
  private selectedIds = new Set<string>();
  private listeners = new Set<Listener>();

  getIds(): string[] {
    return [...this.selectedIds];
  }

  getObjects(document: WhiteboardDocument): WhiteboardObject[] {
    return this.getIds()
      .map((id) => document.getObject(id))
      .filter((o): o is WhiteboardObject => o !== undefined);
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  isEmpty(): boolean {
    return this.selectedIds.size === 0;
  }

  set(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.notify();
  }

  add(id: string): void {
    this.selectedIds.add(id);
    this.notify();
  }

  toggle(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
    this.notify();
  }

  clear(): void {
    if (this.selectedIds.size === 0) return;
    this.selectedIds.clear();
    this.notify();
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
