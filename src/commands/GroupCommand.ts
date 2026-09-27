import type { WhiteboardDocument } from '../document/Document';
import type { GroupObject } from '../model/types';
import type { Command } from './Command';

export class GroupCommand implements Command {
  readonly label = 'Group';

  constructor(
    private readonly document: WhiteboardDocument,
    private readonly childIds: string[],
    private readonly group: GroupObject,
  ) {}

  execute(): void {
    this.document.groupObjects(this.childIds, this.group);
  }

  undo(): void {
    this.document.ungroupObjects(this.group.id);
  }
}
