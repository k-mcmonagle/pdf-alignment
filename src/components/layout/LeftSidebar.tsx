import { useCallback, useRef, useState } from 'react';
import {
  FilePlus,
  Trash2,
  LayoutGrid,
  ArrowRightFromLine,
  ArrowDownFromLine,
  Grid3x3,
  Lock,
  Unlock,
  ChevronLeft,
  FileText,
  Eye,
  GripVertical,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { usePdfLoader } from '../../hooks/usePdfLoader';
import { formatFileSize } from '../../lib/utils';
import type { ArrangeMode, PdfDocument } from '../../types';

export function LeftSidebar() {
  const documents = useStore((s) => s.documents);
  const nodes = useStore((s) => s.nodes);
  const arrangeNodes = useStore((s) => s.arrangeNodes);
  const lastArrangeMode = useStore((s) => s.lastArrangeMode);
  const annotations = useStore((s) => s.annotations);
  const leftSidebarOpen = useStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useStore((s) => s.toggleLeftSidebar);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);
  const updateNode = useStore((s) => s.updateNode);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const setViewport = useStore((s) => s.setViewport);
  const viewport = useStore((s) => s.viewport);
  const { loadFiles, removeFile } = usePdfLoader();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const isInternalDragRef = useRef(false);
  const reorderDocuments = useStore((s) => s.reorderDocuments);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        await loadFiles(files);
      }
      e.target.value = '';
    },
    [loadFiles],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (isInternalDragRef.current) return; // internal reorder, don't treat as file drop
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf',
      );
      if (files.length > 0) {
        await loadFiles(files);
      }
    },
    [loadFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isInternalDragRef.current) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleRemoveDoc = useCallback(
    (doc: PdfDocument) => {
      removeFile(doc.id);
    },
    [removeFile],
  );

  const handleFocusDoc = useCallback(
    (doc: PdfDocument) => {
      // Find the first node for this doc
      const docNodes = nodes.filter((n) => n.documentId === doc.id);
      if (docNodes.length === 0) return;

      const target = docNodes[0];
      const stageEl = document.querySelector('.konvajs-content');
      if (!stageEl) return;

      const containerW = stageEl.clientWidth;
      const containerH = stageEl.clientHeight;

      const padding = 100;
      const scaleX = (containerW - padding * 2) / (target.width * target.scaleX);
      const scaleY = (containerH - padding * 2) / (target.height * target.scaleY);
      let newZoom = Math.min(scaleX, scaleY, 2);
      newZoom = Math.max(newZoom, 0.1);

      const centerX = target.x + (target.width * target.scaleX) / 2;
      const centerY = target.y + (target.height * target.scaleY) / 2;

      setViewport({
        x: containerW / 2 - centerX * newZoom,
        y: containerH / 2 - centerY * newZoom,
        zoom: newZoom,
      });

      // Select all nodes for this doc
      const nodeIds = docNodes.map((n) => n.id);
      setSelectedNodeIds(nodeIds);
    },
    [nodes, setViewport, setSelectedNodeIds],
  );

  const handleArrange = useCallback(
    (mode: ArrangeMode) => {
      arrangeNodes(mode);
    },
    [arrangeNodes],
  );

  if (!leftSidebarOpen) {
    return (
      <div className="w-10 bg-slate-800/95 border-r border-slate-700/50 flex flex-col items-center pt-3 shrink-0 z-10">
        <button
          onClick={toggleLeftSidebar}
          className="btn-icon bg-slate-700 border border-slate-600"
          title="Open document panel"
          aria-label="Open document panel"
        >
          <FileText size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-72 bg-slate-800/95 border-r border-slate-700/50 flex flex-col z-10 shrink-0"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50">
        <span className="text-sm font-semibold text-slate-200">Documents</span>
        <button
          onClick={toggleLeftSidebar}
          className="btn-icon"
          title="Close panel"
          aria-label="Close document panel"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm px-4 text-center gap-3 py-8">
            <FileText size={32} className="opacity-40" />
            <p>No documents loaded</p>
            <p className="text-xs text-slate-600">
              Drop PDF files here or click "Add PDFs" below
            </p>
          </div>
        ) : (
          documents.map((doc, index) => {
            const docNodes = nodes.filter((n) => n.documentId === doc.id);
            const isAnySelected = docNodes.some((n) =>
              selectedNodeIds.includes(n.id),
            );
            const isDragging = dragIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={doc.id}
                draggable
                onDragStart={(e) => {
                  setDragIndex(index);
                  isInternalDragRef.current = true;
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/x-reorder', String(index));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverIndex(index);
                }}
                onDragLeave={() => {
                  setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragIndex !== null && dragIndex !== index) {
                    const hasAnnotations = useStore.getState().annotations.length > 0;
                    if (hasAnnotations) {
                      const proceed = window.confirm(
                        'Reordering will rearrange PDFs on the canvas. Existing annotations may shift relative to their pages.\n\nProceed?',
                      );
                      if (!proceed) {
                        setDragIndex(null);
                        setDragOverIndex(null);
                        isInternalDragRef.current = false;
                        return;
                      }
                    }
                    reorderDocuments(dragIndex, index);
                    // Auto-rearrange on canvas using the last-used layout
                    setTimeout(() => {
                      useStore.getState().arrangeNodes(useStore.getState().lastArrangeMode);
                    }, 0);
                  }
                  setDragIndex(null);
                  setDragOverIndex(null);
                  isInternalDragRef.current = false;
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                  isInternalDragRef.current = false;
                }}
                className={`group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors text-sm
                  ${isAnySelected ? 'bg-brand-600/20 border border-brand-500/30' : 'hover:bg-slate-700/50 border border-transparent'}
                  ${isDragging ? 'opacity-40' : ''}
                  ${isDragOver ? 'border-t-2 !border-t-brand-400' : ''}`}
                onClick={() => handleFocusDoc(doc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleFocusDoc(doc)}
              >
                <GripVertical size={14} className="text-slate-500 shrink-0 cursor-grab active:cursor-grabbing" />
                <FileText size={16} className="text-brand-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-slate-200 text-xs font-medium">
                    {doc.fileName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {doc.pageCount} page{doc.pageCount !== 1 ? 's' : ''} · {formatFileSize(doc.fileSize)}
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocusDoc(doc);
                    }}
                    className="btn-icon w-6 h-6"
                    title="Focus"
                    aria-label={`Focus on ${doc.fileName}`}
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveDoc(doc);
                    }}
                    className="btn-icon w-6 h-6 hover:text-red-400"
                    title="Remove"
                    aria-label={`Remove ${doc.fileName}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-slate-700/50 p-2.5 space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          className="btn-primary w-full text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <FilePlus size={14} />
          Add PDFs
        </button>

        {/* Arrange */}
        {documents.length > 0 && (
          <>
            <div className="panel-heading px-0 pb-0">Arrange</div>
            <div className="flex gap-1">
              <button
                className={`flex-1 text-xs ${lastArrangeMode === 'horizontal' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleArrange('horizontal')}
                title="Arrange horizontally"
              >
                <ArrowRightFromLine size={12} />
                Row
              </button>
              <button
                className={`flex-1 text-xs ${lastArrangeMode === 'vertical' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleArrange('vertical')}
                title="Arrange vertically"
              >
                <ArrowDownFromLine size={12} />
                Col
              </button>
              <button
                className={`flex-1 text-xs ${lastArrangeMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleArrange('grid')}
                title="Arrange in grid"
              >
                <Grid3x3 size={12} />
                Grid
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 w-14">Gap</label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={settings.arrangeGap}
                onChange={(e) => updateSettings({ arrangeGap: Number(e.target.value) })}
                className="flex-1 accent-brand-500"
                title={`Page spacing: ${settings.arrangeGap}px`}
              />
              <span className="text-xs text-slate-500 w-8">{settings.arrangeGap}px</span>
            </div>
          </>
        )}

        {selectedNodeIds.length > 0 && (
          <>
            <div className="panel-heading px-0 pb-0">Selection</div>
            <div className="flex gap-1">
              <button
                className="btn-secondary flex-1 text-xs"
                onClick={() => {
                  selectedNodeIds.forEach((id) => updateNode(id, { locked: true }));
                }}
                title="Lock selected pages"
              >
                <Lock size={12} />
                Lock
              </button>
              <button
                className="btn-secondary flex-1 text-xs"
                onClick={() => {
                  selectedNodeIds.forEach((id) => updateNode(id, { locked: false }));
                }}
                title="Unlock selected pages"
              >
                <Unlock size={12} />
                Unlock
              </button>
            </div>
          </>
        )}

        {documents.length > 0 && (
          <>
            <div className="panel-heading px-0 pb-0">Render Quality</div>
            <select
              className="input-field text-xs"
              value={settings.renderScale}
              onChange={(e) => updateSettings({ renderScale: Number(e.target.value) })}
            >
              <option value={0.5}>Low (0.5x)</option>
              <option value={1}>Medium (1x)</option>
              <option value={1.5}>High (1.5x)</option>
              <option value={2}>Ultra (2x)</option>
            </select>
          </>
        )}
      </div>
    </div>
  );
}
