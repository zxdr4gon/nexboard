import type { WhiteboardProject } from '../model/types';
import { generateId } from './ObjectId';

export function createEmptyProject(name = 'Untitled board'): WhiteboardProject {
  const now = new Date().toISOString();
  const defaultLayerId = generateId('layer');
  return {
    format: 'whiteboard-project',
    version: 1,
    id: generateId('project'),
    metadata: { name, description: '', author: '', thumbnail: null },
    camera: { x: 0, y: 0, zoom: 1 },
    settings: {
      grid: {
        visible: true,
        type: 'dots',
        baseSpacing: 20,
        majorEvery: 5,
        minorDivisions: 5,
        snap: false,
      },
      performanceMode: false,
      snap: { grid: false, object: true, angle: true },
    },
    theme: { mode: 'system', semanticColors: { light: {}, dark: {} } },
    layers: [
      { id: defaultLayerId, name: 'Layer 1', visible: true, locked: false, opacity: 1, objectIds: [] },
    ],
    objects: [],
    assets: {},
    createdAt: now,
    updatedAt: now,
  };
}
