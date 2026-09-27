import type { RestorePlacement, WhiteboardDocument } from '../document/Document';
import type { WhiteboardObject } from '../model/types';
import type { Command } from './Command';

function collectWithGroupChildren(document: WhiteboardDocument, ids: string[]): WhiteboardObject[] {
  const collected = new Map<string, WhiteboardObject>();
  const visit = (id: string): void => {
    if (collected.has(id)) return;
    const object = document.getObject(id);
    if (!object) return;
    collected.set(id, object);
    if (object.type === 'group') {
      for (const childId of object.childIds) visit(childId);
    }
  };
  for (const id of ids) visit(id);
  return [...collected.values()];
}

/** Deletes the given ids, cascading into any group's children so a group deletes atomically. */
export class DeleteObjectsCommand implements Command {
  readonly label = 'Delete';
  private objects: WhiteboardObject[] = [];
  private placements: RestorePlacement[] = [];

  constructor(
    private readonly document: WhiteboardDocument,
    private readonly ids: string[],
  ) {}

  execute(): void {
    this.objects = collectWithGroupChildren(this.document, this.ids);
    this.placements = this.objects
      .map((object) => {
        const index = this.document.getTopLevelIndex(object.layerId, object.id);
        return index >= 0 ? { id: object.id, layerId: object.layerId, index } : null;
      })
      .filter((p): p is RestorePlacement => p !== null);
    this.document.removeObjects(this.objects.map((o) => o.id));
  }

  undo(): void {
    this.document.restoreObjects(this.objects, this.placements);
  }
}
