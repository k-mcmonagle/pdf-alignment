import { useCallback, useRef, useState } from 'react';
import {
  FilePlus,
  Trash2,
  ArrowRightFromLine,
  ArrowDownFromLine,
  Grid3x3,
  Lock,
  Unlock,
  ChevronLeft,
  FileText,
  Eye,
  GripVertical,
  MoreHorizontal,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { usePdfLoader } from '../../hooks/usePdfLoader';
import { formatFileSize, getDefaultDocumentName } from '../../lib/utils';
import { getViewportForNode } from '../../lib/workspaceViewport';
import type { ArrangeMode, PdfDocument } from '../../types';

export function LeftSidebar() {
  const documents = useStore((s) => s.documents);
  const nodes = useStore((s) => s.nodes);
  const updateDocument = useStore((s) => s.updateDocument);
  const arrangeNodes = useStore((s) => s.arrangeNodes);
  const lastArrangeMode = useStore((s) => s.lastArrangeMode);
  const leftSidebarOpen = useStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useStore((s) => s.toggleLeftSidebar);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);
  const updateNode = useStore((s) => s.updateNode);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const setViewport = useStore((s) => s.setViewport);
  const { loadFiles, removeFile } = usePdfLoader();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
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
      setViewport(
        getViewportForNode(target, {
          width: containerW,
          height: containerH,
        }),
      );

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
            const isEditing = editingDocumentId === doc.id;
            const isRenamed =
              doc.displayName.trim() !== getDefaultDocumentName(doc.fileName);

            return (
              <div
                key={doc.id}
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
                className={`group rounded-md border px-2.5 py-2 cursor-pointer transition-colors text-sm
                  ${isAnySelected ? 'bg-brand-600/20 border-brand-500/30' : 'hover:bg-slate-700/50 border-transparent'}
                  ${isDragging ? 'opacity-40' : ''}
                  ${isDragOver ? 'border-t-2 !border-t-brand-400' : ''}`}
                onClick={() => handleFocusDoc(doc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) {
                    handleFocusDoc(doc);
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(index);
                      isInternalDragRef.current = true;
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/x-reorder', String(index));
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDragOverIndex(null);
                      isInternalDragRef.current = false;
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 flex h-6 w-4 shrink-0 items-center justify-center text-slate-500 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label={`Drag to reorder ${doc.displayName}`}
                  >
                    <GripVertical size={14} />
                  </div>
                  <FileText size={16} className="text-brand-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-slate-200">
                          {doc.displayName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {doc.pageCount} page{doc.pageCount !== 1 ? 's' : ''} · {formatFileSize(doc.fileSize)}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFocusDoc(doc);
                          }}
                          className="btn-icon h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                          title="Focus"
                          aria-label={`Focus on ${doc.displayName}`}
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDocumentId((current) =>
                              current === doc.id ? null : doc.id,
                            );
                          }}
                          className={`btn-icon h-6 w-6 ${
                            isEditing ? 'text-brand-400' : ''
                          }`}
                          title="Document options"
                          aria-label={`Open options for ${doc.displayName}`}
                        >
                          <MoreHorizontal size={12} />
                        </button>
                      </div>
                    </div>
                    {doc.note.trim() && (
                      <div
                        className="mt-1 truncate text-[10px] text-slate-400"
                        title={doc.note}
                      >
                        {doc.note}
                      </div>
                    )}
                    {isEditing && (
                      <div
                        className="mt-2 space-y-2 rounded-md border border-slate-700/60 bg-slate-900/45 p-2"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={doc.displayName}
                          maxLength={120}
                          className="input-field h-7 text-xs font-medium"
                          placeholder="Document name"
                          onChange={(e) =>
                            updateDocument(doc.id, {
                              displayName: e.target.value.slice(0, 120),
                            })
                          }
                          onKeyDown={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            if (!e.target.value.trim()) {
                              updateDocument(doc.id, {
                                displayName: getDefaultDocumentName(doc.fileName),
                              });
                            }
                          }}
                        />
                        {isRenamed && (
                          <div className="truncate text-[10px] text-slate-500" title={doc.fileName}>
                            Source: {doc.fileName}
                          </div>
                        )}
                        <textarea
                          className="input-field min-h-[60px] resize-y text-[11px]"
                          rows={3}
                          maxLength={1000}
                          placeholder="Document note…"
                          value={doc.note}
                          onChange={(e) =>
                            updateDocument(doc.id, {
                              note: e.target.value.slice(0, 1000),
                            })
                          }
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setEditingDocumentId(null)}
                            className="btn-secondary px-2.5 py-1 text-[11px]"
                            type="button"
                          >
                            Done
                          </button>
                          <button
                            onClick={() => handleRemoveDoc(doc)}
                            className="btn-secondary px-2.5 py-1 text-[11px] hover:text-red-400"
                            type="button"
                          >
                            <Trash2 size={11} />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
