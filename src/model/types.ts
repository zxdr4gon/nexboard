// Canonical document data model (spec sections 6-14). Phase 1 shipped
// StrokeObject only; Phase 2 adds shapes, groups, and the style types
// they need. WhiteboardObject keeps growing as a union — ObjectRenderer,
// ObjectGeometry, and HitTesting all switch on `type` so new members
// slot in without touching existing cases.

import type { Point } from './geometry';
export type { Point };

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

// Fill paint for shapes (spec section 146). 'solid' keeps fill opacity
// independent of stroke opacity, per that section's instruction.
export type Paint = { type: 'none' } | { type: 'solid'; color: SemanticColor; opacity: number };

// Stroke rendering style for shapes (spec section 147).
export interface StrokeStyle {
  color: SemanticColor;
  width: number;
  cap: 'butt' | 'round' | 'square';
  join: 'miter' | 'round' | 'bevel';
  dash?: number[];
  opacity: number;
}

export type ObjectType =
  | 'stroke'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'polygon'
  | 'group';

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

// --- Shapes (spec section 9) ---------------------------------------
//
// Geometry convention (not fully pinned down by the spec, decided
// here for consistency across every shape type):
//   - Rectangle/Ellipse/Triangle/Polygon store LOCAL geometry centered
//     on the origin. transform.x/y is the shape's center in world
//     space; transform.rotation is applied about that center. Resize
//     mutates the shape's own size fields directly (width/height,
//     radiusX/radiusY, vertex positions) rather than via
//     transform.scaleX/scaleY, which stay at 1 — this avoids
//     compounding floating-point scale drift across repeated resizes.
//     transform.scaleX/scaleY are reserved for a future nested-group
//     transform composition (spec section 230) that Phase 2 does not
//     implement (see README).
//   - Line/Arrow store absolute WORLD-SPACE start/end points directly,
//     the same convention Phase 1 used for stroke points. Using
//     transform on top of two explicit points would double-encode
//     position/rotation, so transform stays identity for these two
//     types; moving/rotating a line mutates start/end directly.

export interface RectangleObject extends BaseObject {
  type: 'rectangle';
  width: number;
  height: number;
  radius: number;
  fill: Paint;
  stroke: StrokeStyle;
}

export interface EllipseObject extends BaseObject {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
  fill: Paint;
  stroke: StrokeStyle;
}

export interface TriangleObject extends BaseObject {
  type: 'triangle';
  width: number;
  height: number;
  fill: Paint;
  stroke: StrokeStyle;
}

export interface LineObject extends BaseObject {
  type: 'line';
  start: Point;
  end: Point;
  stroke: StrokeStyle;
}

// Spec section 9 writes `ArrowObject extends LineObject`, but that's
// not expressible in TypeScript (the discriminant `type` would have to
// narrow from 'line' to 'arrow', which interface extension disallows).
// ArrowObject instead duplicates LineObject's fields directly — same
// shape, valid types.
export interface ArrowObject extends BaseObject {
  type: 'arrow';
  start: Point;
  end: Point;
  stroke: StrokeStyle;
  arrowStart: boolean;
  arrowEnd: boolean;
  arrowSize: number;
}

export interface PolygonObject extends BaseObject {
  type: 'polygon';
  /** Local-space, relative to transform.x/y (the polygon's centroid at creation time). */
  vertices: Point[];
  fill: Paint;
  stroke: StrokeStyle;
}

// Grouping (spec section 48). Phase 2 supports a single level of
// grouping only — a group's childIds never point at another group.
// See README for why nested groups are deferred.
export interface GroupObject extends BaseObject {
  type: 'group';
  childIds: string[];
}

export type WhiteboardObject =
  | StrokeObject
  | RectangleObject
  | EllipseObject
  | TriangleObject
  | LineObject
  | ArrowObject
  | PolygonObject
  | GroupObject;

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
