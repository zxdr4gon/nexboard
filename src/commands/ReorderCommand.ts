import type { WhiteboardDocument } from '../document/Document';
import type { Command } from './Command';

export class ReorderCommand implements Command {
  readonly label = 'Reorder';

  constructor(
    private readonly document: WhiteboardDocument,
    private readonly layerId: string,
    private readonly id: string,
    private readonly fromIndex: number,
    private readonly toIndex: number,
  ) {}

  execute(): void {
    this.document.reorderTopLevel(this.layerId, this.id, this.toIndex);
  }

  undo(): void {
    this.document.reorderTopLevel(this.layerId, this.id, this.fromIndex);
  }
}
