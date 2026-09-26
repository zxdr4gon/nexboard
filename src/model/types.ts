// Canonical document data model (spec sections 6-14, scoped to what
// Phase 1 needs: stroke objects only). WhiteboardObject is a union of
// one member today; later phases extend it with shapes/text/images
// without changing anything that already consumes this type.

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type SemanticToken =
  | 'ink-primary'
  | 'ink-secondary'
  | 'ink-muted'
  | 'accent'
  | 'selection'
  | 'highlighter'
  | 'background'
  | 'grid-major'
  | 'grid-minor';

export type SemanticColor =
  | { mode: 'semantic'; token: SemanticToken }
  | { mode: 'literal'; value: string; preserveAcrossThemes: true }
  | { mode: 'adaptive-literal'; light: string; dark: string };

export interface ThemeState {
  mode: ThemeMode;
  semanticColors: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface ObjectStyle {
  strokeColor?: SemanticColor;
  fillColor?: SemanticColor;
}

export type ObjectType = 'stroke'; // union grows in Phase 2+

export interface BaseObject {
  id: string;
  type: ObjectType;
  layerId: string;
  parentId?: string | null;
  visible: boolean;
  locked: boolean;
  opacity: number;
  transform: Transform;
  style: ObjectStyle;
  metadata?: Record<string, unknown>;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  time?: number;
}

export interface StrokeObject extends BaseObject {
  type: 'stroke';
  tool: 'pen' | 'marker' | 'highlighter' | 'eraser-mask';
  points: StrokePoint[];
  width: number;
  smoothing: {
    streamline: number;
    simplifyTolerance: number;
  };
  brushSettings: {
    opacity: number;
    pressureEnabled: boolean;
  };
  color: SemanticColor;
}

// Only StrokeObject exists in Phase 1.
export type WhiteboardObject = StrokeObject;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  objectIds: string[];
}

export interface GridSettings {
  visible: boolean;
  type: 'none' | 'dots' | 'square' | 'graph';
  baseSpacing: number;
  majorEvery: number;
  minorDivisions: number;
  snap: boolean;
}

export interface DocumentSettings {
  grid: GridSettings;
  performanceMode: boolean;
  snap: {
    grid: boolean;
    object: boolean;
    angle: boolean;
  };
}

export interface ProjectMetadata {
  name: string;
  description: string;
  author: string;
  thumbnail: string | null;
}

// Populated in Phase 3 (image assets); empty object is valid today.
export type AssetManifest = Record<string, unknown>;

export interface WhiteboardProject {
  format: 'whiteboard-project';
  version: number;
  id: string;
  metadata: ProjectMetadata;
  camera: CameraState;
  settings: DocumentSettings;
  theme: ThemeState;
  layers: Layer[];
  objects: WhiteboardObject[];
  assets: AssetManifest;
  createdAt: string;
  updatedAt: string;
}
