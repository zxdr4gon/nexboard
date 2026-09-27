import type { WhiteboardDocument } from '../document/Document';
import type { GroupObject } from '../model/types';
import type { Command } from './Command';

export class UngroupCommand implements Command {
  readonly label = 'Ungroup';
  private readonly childIds: string[];

  constructor(
    private readonly document: WhiteboardDocument,
    private readonly group: GroupObject,
  ) {
    this.childIds = [...group.childIds];
  }

  execute(): void {
    this.document.ungroupObjects(this.group.id);
  }

  undo(): void {
    this.document.groupObjects(this.childIds, this.group);
  }
}
