// ─── Tool Types ───────────────────────────────────────────────
export type ToolType =
  | 'select'
  | 'hand'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'highlight'
  | 'measure';

// ─── Annotation Shape Types ──────────────────────────────────
export type ShapeType = 'rect' | 'ellipse' | 'arrow' | 'line' | 'pen' | 'text' | 'highlight' | 'measure';

export type DashStyle = 'solid' | 'dashed' | 'dotted';

export interface AnnotationBase {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  fill: string;
  dash: DashStyle;
  locked: boolean;
  note: string;
  createdAt: number;
}

export interface RectAnnotation extends AnnotationBase {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius: number;
}

export interface EllipseAnnotation extends AnnotationBase {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

export interface ArrowAnnotation extends AnnotationBase {
  type: 'arrow';
  points: number[];
}

export interface LineAnnotation extends AnnotationBase {
  type: 'line';
  points: number[];
}

export interface PenAnnotation extends AnnotationBase {
  type: 'pen';
  points: number[];
}

export interface TextAnnotation extends AnnotationBase {
  type: 'text';
  text: string;
  fontSize: number;
  width: number;
  height: number;
}

export interface HighlightAnnotation extends AnnotationBase {
  type: 'highlight';
  width: number;
  height: number;
}

export interface MeasureAnnotation extends AnnotationBase {
  type: 'measure';
  points: number[]; // [x1, y1, x2, y2]
  /** Pixel distance of the drawn line */
  pixelLength: number;
  /** Real-world distance label entered by user (e.g. "5.2 m") */
  realLength: string;
}

export type Annotation =
  | RectAnnotation
  | EllipseAnnotation
  | ArrowAnnotation
  | LineAnnotation
  | PenAnnotation
  | TextAnnotation
  | HighlightAnnotation
  | MeasureAnnotation;

// ─── PDF Document Types ──────────────────────────────────────
export interface PdfPageInfo {
  pageNumber: number;
  width: number; // Natural width at scale 1
  height: number; // Natural height at scale 1
}

export interface PdfDocument {
  id: string;
  fileName: string;
  displayName: string;
  note: string;
  fileSize: number;
  pageCount: number;
  pages: PdfPageInfo[];
  /** SHA-256 fingerprint for relinking */
  fingerprint: string;
}

// ─── Canvas Node (positioned item on canvas) ─────────────────
export interface CanvasNode {
  id: string;
  documentId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  locked: boolean;
  visible: boolean;
}

// ─── Workspace / Project ─────────────────────────────────────
export type ArrangeMode = 'horizontal' | 'vertical' | 'grid';

export interface WorkspaceSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  renderScale: number; // PDF render quality (0.5 = low, 1 = normal, 2 = high)
  backgroundColor: string;
  arrangeGap: number; // Spacing between pages in arrange mode
}

/** Calibration: maps a pixel distance to a real-world distance */
export interface MeasureCalibration {
  pixelLength: number;
  realValue: number;
  unit: string; // e.g. 'm', 'ft', 'mm'
}

export interface WorkspaceProject {
  version: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: WorkspaceSettings;
  documents: PdfDocument[];
  nodes: CanvasNode[];
  annotations: Annotation[];
  viewport: { x: number; y: number; zoom: number };
  measureCalibration?: MeasureCalibration | null;
  drawStyle?: DrawStyle;
  lastArrangeMode?: ArrangeMode;
}

export interface WorkspaceArchive {
  format: 'alignpdf';
  version: number;
  exportedAt: number;
  project: WorkspaceProject;
  embeddedPdfs?: Record<string, string>;
}

export interface ImportedWorkspace {
  project: WorkspaceProject;
  pdfBuffers: Record<string, ArrayBuffer>;
}

// ─── View State ──────────────────────────────────────────────
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ─── Draw Style ──────────────────────────────────────────────
export interface DrawStyle {
  stroke: string;
  strokeWidth: number;
  fill: string;
  opacity: number;
  fontSize: number;
  dash: DashStyle;
}

// ─── Defaults ────────────────────────────────────────────────
export const DEFAULT_SETTINGS: WorkspaceSettings = {
  showGrid: true,
  snapToGrid: false,
  gridSize: 50,
  renderScale: 1.5,
  backgroundColor: '#1e293b',
  arrangeGap: 60,
};

export const DEFAULT_DRAW_STYLE: DrawStyle = {
  stroke: '#ef4444',
  strokeWidth: 3,
  fill: 'transparent',
  opacity: 1,
  fontSize: 16,
  dash: 'solid',
};

/** Convert DashStyle to Konva dash array */
export function getDashArray(dash: DashStyle, strokeWidth: number): number[] | undefined {
  switch (dash) {
    case 'dashed': return [strokeWidth * 4, strokeWidth * 2];
    case 'dotted': return [strokeWidth, strokeWidth * 2];
    default: return undefined;
  }
}

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
