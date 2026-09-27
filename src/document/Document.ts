import type { DocumentSettings, GroupObject, Layer, WhiteboardObject, WhiteboardProject } from '../model/types';
import { createEmptyProject } from './DocumentFactory';

type ChangeListener = () => void;

export interface RestorePlacement {
  id: string;
  layerId: string;
  index: number;
}

// Document store for the in-memory project. Phase 2 keeps this a
// direct-mutation store (spec section 59's Command layer sits ON TOP of
// this, in commands/) — Document itself has no undo concept; every
// mutating method here is paired with an inverse used by some Command's
// undo(). Z-order and grouping both operate on layer.objectIds, per
// spec section 233's "layer order -> objectIds order" model.
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

  getLayerById(id: string): Layer | undefined {
    return this.project.layers.find((l) => l.id === id);
  }

  getSettings(): DocumentSettings {
    return this.project.settings;
  }

  /**
   * Flattened draw/hit-test order (spec section 233): top-level
   * objectIds in order, with any group expanded into its children (in
   * the group's own childIds order) in its place. Only leaf (non-group)
   * objects are returned — ObjectRenderer and HitTesting never need to
   * special-case 'group'.
   */
  getRenderOrder(): WhiteboardObject[] {
    const result: WhiteboardObject[] = [];
    const expand = (id: string): void => {
      const object = this.getObject(id);
      if (!object) return;
      if (object.type === 'group') {
        for (const childId of object.childIds) expand(childId);
      } else {
        result.push(object);
      }
    };
    for (const layer of this.project.layers) {
      if (!layer.visible) continue;
      for (const id of layer.objectIds) expand(id);
    }
    return result;
  }

  addObject(object: WhiteboardObject): void {
    this.addObjects([object]);
  }

  addObjects(objects: WhiteboardObject[]): void {
    if (objects.length === 0) return;
    for (const object of objects) {
      this.project.objects.push(object);
      const layer = this.getLayerById(object.layerId);
      layer?.objectIds.push(object.id);
    }
    this.touch();
  }

  /** Removes objects entirely (from the flat list and any layer.objectIds). Group children are not typically in objectIds directly, so this is safe to call with a mixed id list. */
  removeObjects(ids: string[]): void {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    this.project.objects = this.project.objects.filter((o) => !idSet.has(o.id));
    for (const layer of this.project.layers) {
      layer.objectIds = layer.objectIds.filter((id) => !idSet.has(id));
    }
    this.touch();
  }

  /** Inverse of removeObjects — reinserts objects and splices their ids back into their recorded layer position. Used by delete-undo. */
  restoreObjects(objects: WhiteboardObject[], placements: RestorePlacement[]): void {
    if (objects.length === 0) return;
    this.project.objects.push(...objects);
    // Insert in ascending index order so earlier splices don't shift later target indices.
    const sorted = [...placements].sort((a, b) => a.index - b.index);
    for (const placement of sorted) {
      const layer = this.getLayerById(placement.layerId);
      if (!layer) continue;
      const index = Math.min(placement.index, layer.objectIds.length);
      layer.objectIds.splice(index, 0, placement.id);
    }
    this.touch();
  }

  replaceObject(id: string, next: WhiteboardObject): void {
    this.replaceObjectQuiet(id, next);
    this.touch();
  }

  replaceObjects(entries: { id: string; next: WhiteboardObject }[]): void {
    if (entries.length === 0) return;
    for (const entry of entries) this.replaceObjectQuiet(entry.id, entry.next);
    this.touch();
  }

  private replaceObjectQuiet(id: string, next: WhiteboardObject): void {
    const index = this.project.objects.findIndex((o) => o.id === id);
    if (index >= 0) this.project.objects[index] = next;
  }

  getTopLevelIndex(layerId: string, id: string): number {
    return this.getLayerById(layerId)?.objectIds.indexOf(id) ?? -1;
  }

  /** Moves a top-level id (object or group) to a new index within its layer's stacking order. */
  reorderTopLevel(layerId: string, id: string, toIndex: number): void {
    const layer = this.getLayerById(layerId);
    if (!layer) return;
    const fromIndex = layer.objectIds.indexOf(id);
    if (fromIndex < 0) return;
    const clampedTo = Math.max(0, Math.min(toIndex, layer.objectIds.length - 1));
    if (clampedTo === fromIndex) return;
    layer.objectIds.splice(fromIndex, 1);
    layer.objectIds.splice(clampedTo, 0, id);
    this.touch();
  }

  /** Groups the given top-level ids into a new group at the position of the topmost (highest z) among them. */
  groupObjects(ids: string[], group: GroupObject): void {
    const layer = this.getLayerById(group.layerId);
    if (!layer) return;

    for (const id of ids) {
      const child = this.getObject(id);
      if (child) this.replaceObjectQuiet(id, { ...child, parentId: group.id });
    }
    this.project.objects.push(group);

    const idSet = new Set(ids);
    const indices = ids.map((id) => layer.objectIds.indexOf(id)).filter((i) => i >= 0);
    const maxIndex = indices.length > 0 ? Math.max(...indices) : layer.objectIds.length - 1;
    const nextIds: string[] = [];
    let inserted = false;
    for (let i = 0; i < layer.objectIds.length; i++) {
      const id = layer.objectIds[i];
      if (idSet.has(id)) {
        if (i === maxIndex) {
          nextIds.push(group.id);
          inserted = true;
        }
        continue;
      }
      nextIds.push(id);
    }
    if (!inserted) nextIds.push(group.id);
    layer.objectIds = nextIds;
    this.touch();
  }

  /** Reverses groupObjects: removes the group, splices its children back at the group's former position, clears their parentId. */
  ungroupObjects(groupId: string): void {
    const group = this.getObject(groupId);
    if (!group || group.type !== 'group') return;
    const layer = this.getLayerById(group.layerId);
    if (!layer) return;

    for (const id of group.childIds) {
      const child = this.getObject(id);
      if (child) this.replaceObjectQuiet(id, { ...child, parentId: null });
    }

    const index = layer.objectIds.indexOf(groupId);
    const nextIds = [...layer.objectIds];
    if (index >= 0) nextIds.splice(index, 1, ...group.childIds);
    layer.objectIds = nextIds;

    this.project.objects = this.project.objects.filter((o) => o.id !== groupId);
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
