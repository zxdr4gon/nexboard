import type { WhiteboardDocument } from '../document/Document';
import type { WhiteboardObject } from '../model/types';
import type { Command } from './Command';

/** Used for pen strokes, shape-tool commits, hold-to-snap commits, and duplication. */
export class AddObjectsCommand implements Command {
  readonly label: string;

  constructor(
    private readonly document: WhiteboardDocument,
    private readonly objects: WhiteboardObject[],
    label = objects.length > 1 ? 'Add objects' : 'Add object',
  ) {
    this.label = label;
  }

  execute(): void {
    this.document.addObjects(this.objects);
  }

  undo(): void {
    this.document.removeObjects(this.objects.map((o) => o.id));
  }
}
