import type { WhiteboardDocument } from '../document/Document';
import type { WhiteboardObject } from '../model/types';
import type { Command } from './Command';

export interface TransformEntry {
  id: string;
  before: WhiteboardObject;
  after: WhiteboardObject;
}

/** Covers move, resize, and rotate — all are "replace these objects' geometry" operations, undoable as one history entry regardless of how many objects were involved. */
export class TransformObjectsCommand implements Command {
  constructor(
    private readonly document: WhiteboardDocument,
    private readonly entries: TransformEntry[],
    readonly label = 'Transform',
  ) {}

  execute(): void {
    this.document.replaceObjects(this.entries.map((e) => ({ id: e.id, next: e.after })));
  }

  undo(): void {
    this.document.replaceObjects(this.entries.map((e) => ({ id: e.id, next: e.before })));
  }
}
