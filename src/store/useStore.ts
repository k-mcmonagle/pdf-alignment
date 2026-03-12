import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Annotation,
  ArrangeMode,
  CanvasNode,
  DrawStyle,
  MeasureCalibration,
  PdfDocument,
  ToolType,
  Viewport,
  WorkspaceProject,
  WorkspaceSettings,
} from '../types';
import {
  DEFAULT_DRAW_STYLE,
  DEFAULT_SETTINGS,
  DEFAULT_VIEWPORT,
} from '../types';

export interface AppState {
  // ─── Tool ─────────────────────────────────────────
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // ─── Draw Style ───────────────────────────────────
  drawStyle: DrawStyle;
  setDrawStyle: (style: Partial<DrawStyle>) => void;

  // ─── Viewport ─────────────────────────────────────
  viewport: Viewport;
  setViewport: (v: Partial<Viewport>) => void;

  // ─── Documents ────────────────────────────────────
  documents: PdfDocument[];
  addDocument: (doc: PdfDocument) => void;
  removeDocument: (id: string) => void;
  reorderDocuments: (fromIndex: number, toIndex: number) => void;

  // ─── Canvas Nodes ─────────────────────────────────
  nodes: CanvasNode[];
  addNode: (node: CanvasNode) => void;
  updateNode: (id: string, changes: Partial<CanvasNode>) => void;
  removeNode: (id: string) => void;
  removeNodesByDocument: (documentId: string) => void;

  // ─── Selection ────────────────────────────────────
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  selectedAnnotationIds: string[];
  setSelectedAnnotationIds: (ids: string[]) => void;

  // ─── Annotations ──────────────────────────────────
  annotations: Annotation[];
  addAnnotation: (a: Annotation) => void;
  updateAnnotation: (id: string, changes: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;

  // ─── Settings ─────────────────────────────────────
  settings: WorkspaceSettings;
  updateSettings: (s: Partial<WorkspaceSettings>) => void;

  // ─── Workspace ────────────────────────────────────
  projectName: string;
  setProjectName: (name: string) => void;
  isDirty: boolean;
  markDirty: () => void;
  markClean: () => void;

  // ─── UI State ─────────────────────────────────────
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // ─── Arrange ──────────────────────────────────────
  arrangeNodes: (mode: ArrangeMode) => void;

  // ─── Measure Calibration ──────────────────────────
  measureCalibration: MeasureCalibration | null;
  setMeasureCalibration: (cal: MeasureCalibration | null) => void;
  /** Pending calibration line pixel length, awaiting user input */
  pendingCalibrationPixels: number | null;
  setPendingCalibrationPixels: (px: number | null) => void;

  // ─── Bulk ─────────────────────────────────────────
  loadProject: (project: WorkspaceProject) => void;
  getProject: () => WorkspaceProject;
  resetWorkspace: () => void;
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // ─── Tool ─────────────────────────────────────────
    activeTool: 'select',
    setActiveTool: (tool) => set({ activeTool: tool }),

    // ─── Draw Style ───────────────────────────────────
    drawStyle: { ...DEFAULT_DRAW_STYLE },
    setDrawStyle: (style) =>
      set((s) => ({ drawStyle: { ...s.drawStyle, ...style } })),

    // ─── Viewport ─────────────────────────────────────
    viewport: { ...DEFAULT_VIEWPORT },
    setViewport: (v) => set((s) => ({ viewport: { ...s.viewport, ...v } })),

    // ─── Documents ────────────────────────────────────
    documents: [],
    addDocument: (doc) =>
      set((s) => ({ documents: [...s.documents, doc], isDirty: true })),
    removeDocument: (id) =>
      set((s) => ({
        documents: s.documents.filter((d) => d.id !== id),
        isDirty: true,
      })),
    reorderDocuments: (fromIndex, toIndex) =>
      set((s) => {
        const docs = [...s.documents];
        const [removed] = docs.splice(fromIndex, 1);
        docs.splice(toIndex, 0, removed);
        return { documents: docs, isDirty: true };
      }),

    // ─── Canvas Nodes ─────────────────────────────────
    nodes: [],
    addNode: (node) =>
      set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),
    updateNode: (id, changes) =>
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n)),
        isDirty: true,
      })),
    removeNode: (id) =>
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        isDirty: true,
      })),
    removeNodesByDocument: (documentId) =>
      set((s) => ({
        nodes: s.nodes.filter((n) => n.documentId !== documentId),
        isDirty: true,
      })),

    // ─── Selection ────────────────────────────────────
    selectedNodeIds: [],
    setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
    selectedAnnotationIds: [],
    setSelectedAnnotationIds: (ids) => set({ selectedAnnotationIds: ids }),

    // ─── Annotations ──────────────────────────────────
    annotations: [],
    addAnnotation: (a) =>
      set((s) => ({ annotations: [...s.annotations, a], isDirty: true })),
    updateAnnotation: (id, changes) =>
      set((s) => ({
        annotations: s.annotations.map((a) =>
          a.id === id ? ({ ...a, ...changes } as Annotation) : a,
        ),
        isDirty: true,
      })),
    removeAnnotation: (id) =>
      set((s) => ({
        annotations: s.annotations.filter((a) => a.id !== id),
        isDirty: true,
      })),

    // ─── Settings ─────────────────────────────────────
    settings: { ...DEFAULT_SETTINGS },
    updateSettings: (s) =>
      set((state) => ({
        settings: { ...state.settings, ...s },
        isDirty: true,
      })),

    // ─── Workspace ────────────────────────────────────
    projectName: 'Untitled Workspace',
    setProjectName: (name) => set({ projectName: name, isDirty: true }),
    isDirty: false,
    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),

    // ─── UI State ─────────────────────────────────────
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
    toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
    isLoading: false,
    loadingMessage: '',
    setLoading: (loading, message = '') =>
      set({ isLoading: loading, loadingMessage: message }),

    // ─── Arrange ──────────────────────────────────────
    arrangeNodes: (mode) =>
      set((s) => {
        const gap = s.settings.arrangeGap;
        const sorted = [...s.nodes].sort((a, b) => {
          const docA = s.documents.findIndex((d) => d.id === a.documentId);
          const docB = s.documents.findIndex((d) => d.id === b.documentId);
          if (docA !== docB) return docA - docB;
          return a.pageNumber - b.pageNumber;
        });

        let x = gap;
        let y = gap;
        let maxRowHeight = 0;

        if (mode === 'horizontal') {
          const updated = sorted.map((node) => {
            const n = { ...node, x, y: gap };
            x += node.width * node.scaleX + gap;
            return n;
          });
          return { nodes: updated, isDirty: true };
        }

        if (mode === 'vertical') {
          const updated = sorted.map((node) => {
            const n = { ...node, x: gap, y };
            y += node.height * node.scaleY + gap;
            return n;
          });
          return { nodes: updated, isDirty: true };
        }

        // grid
        const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
        let col = 0;
        const updated = sorted.map((node) => {
          const n = { ...node, x, y };
          maxRowHeight = Math.max(maxRowHeight, node.height * node.scaleY);
          col++;
          x += node.width * node.scaleX + gap;
          if (col >= cols) {
            col = 0;
            x = gap;
            y += maxRowHeight + gap;
            maxRowHeight = 0;
          }
          return n;
        });
        return { nodes: updated, isDirty: true };
      }),

    // ─── Measure Calibration ──────────────────────────
    measureCalibration: null,
    setMeasureCalibration: (cal) => set({ measureCalibration: cal }),
    pendingCalibrationPixels: null,
    setPendingCalibrationPixels: (px) => set({ pendingCalibrationPixels: px }),

    // ─── Bulk ─────────────────────────────────────────
    loadProject: (project) =>
      set({
        projectName: project.name,
        settings: { ...DEFAULT_SETTINGS, ...project.settings },
        documents: project.documents,
        nodes: project.nodes,
        annotations: project.annotations,
        viewport: project.viewport || DEFAULT_VIEWPORT,
        isDirty: false,
        selectedNodeIds: [],
        selectedAnnotationIds: [],
      }),

    getProject: (): WorkspaceProject => {
      const s = get();
      return {
        version: 1,
        name: s.projectName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: s.settings,
        documents: s.documents,
        nodes: s.nodes,
        annotations: s.annotations,
        viewport: s.viewport,
      };
    },

    resetWorkspace: () =>
      set({
        documents: [],
        nodes: [],
        annotations: [],
        viewport: { ...DEFAULT_VIEWPORT },
        settings: { ...DEFAULT_SETTINGS },
        projectName: 'Untitled Workspace',
        selectedNodeIds: [],
        selectedAnnotationIds: [],
        isDirty: false,
        activeTool: 'select',
      }),
  })),
);
