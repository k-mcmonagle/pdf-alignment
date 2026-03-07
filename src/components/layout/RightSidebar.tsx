import { useCallback } from 'react';
import {
  ChevronRight,
  Trash2,
  Lock,
  Unlock,
  MessageSquare,
  Pen,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  Highlighter,
  StickyNote,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Annotation, ShapeType } from '../../types';

const typeIcons: Record<ShapeType, React.ReactNode> = {
  rect: <Square size={14} />,
  ellipse: <Circle size={14} />,
  arrow: <ArrowRight size={14} />,
  line: <Minus size={14} />,
  pen: <Pen size={14} />,
  text: <Type size={14} />,
  highlight: <Highlighter size={14} />,
};

const typeLabels: Record<ShapeType, string> = {
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  arrow: 'Arrow',
  line: 'Line',
  pen: 'Freehand',
  text: 'Note',
  highlight: 'Highlight',
};

export function RightSidebar() {
  const annotations = useStore((s) => s.annotations);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const selectedAnnotationIds = useStore((s) => s.selectedAnnotationIds);
  const setSelectedAnnotationIds = useStore((s) => s.setSelectedAnnotationIds);
  const rightSidebarOpen = useStore((s) => s.rightSidebarOpen);
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar);
  const drawStyle = useStore((s) => s.drawStyle);
  const setDrawStyle = useStore((s) => s.setDrawStyle);

  const handleSelectAnnotation = useCallback(
    (id: string) => {
      setSelectedAnnotationIds([id]);
    },
    [setSelectedAnnotationIds],
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      const ann = annotations.find((a) => a.id === id);
      if (ann) {
        updateAnnotation(id, { locked: !ann.locked });
      }
    },
    [annotations, updateAnnotation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      removeAnnotation(id);
      setSelectedAnnotationIds(selectedAnnotationIds.filter((a) => a !== id));
    },
    [removeAnnotation, setSelectedAnnotationIds, selectedAnnotationIds],
  );

  const handleNoteChange = useCallback(
    (id: string, note: string) => {
      updateAnnotation(id, { note });
    },
    [updateAnnotation],
  );

  const handleTextChange = useCallback(
    (id: string, text: string) => {
      updateAnnotation(id, { text } as Partial<Annotation>);
    },
    [updateAnnotation],
  );

  if (!rightSidebarOpen) {
    return (
      <button
        onClick={toggleRightSidebar}
        className="absolute top-3 right-3 z-30 btn-icon bg-slate-800 border border-slate-700"
        title="Open annotations panel"
        aria-label="Open annotations panel"
      >
        <MessageSquare size={16} />
      </button>
    );
  }

  return (
    <div className="w-72 bg-slate-800/95 border-l border-slate-700/50 flex flex-col z-10 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50">
        <span className="text-sm font-semibold text-slate-200">Annotations</span>
        <button
          onClick={toggleRightSidebar}
          className="btn-icon"
          title="Close panel"
          aria-label="Close annotations panel"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Draw style */}
      <div className="sidebar-section space-y-2">
        <div className="panel-heading px-0 pt-0">Style</div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 w-14">Color</label>
          <input
            type="color"
            value={drawStyle.stroke}
            onChange={(e) => setDrawStyle({ stroke: e.target.value })}
            className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent"
            title="Stroke color"
          />
          <input
            type="range"
            min="1"
            max="12"
            value={drawStyle.strokeWidth}
            onChange={(e) => setDrawStyle({ strokeWidth: Number(e.target.value) })}
            className="flex-1 accent-brand-500"
            title={`Stroke width: ${drawStyle.strokeWidth}px`}
          />
          <span className="text-xs text-slate-500 w-5">{drawStyle.strokeWidth}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 w-14">Opacity</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={drawStyle.opacity}
            onChange={(e) => setDrawStyle({ opacity: Number(e.target.value) })}
            className="flex-1 accent-brand-500"
            title={`Opacity: ${Math.round(drawStyle.opacity * 100)}%`}
          />
          <span className="text-xs text-slate-500 w-8">
            {Math.round(drawStyle.opacity * 100)}%
          </span>
        </div>
      </div>

      {/* Annotations list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm text-center gap-2">
            <StickyNote size={28} className="opacity-40" />
            <p className="text-xs">No annotations yet</p>
            <p className="text-[10px] text-slate-600">
              Use the drawing tools to add markups
            </p>
          </div>
        ) : (
          annotations.map((ann) => {
            const isSelected = selectedAnnotationIds.includes(ann.id);
            return (
              <div
                key={ann.id}
                className={`rounded-md border transition-colors text-xs
                  ${isSelected ? 'bg-brand-600/15 border-brand-500/30' : 'bg-slate-750 border-slate-700/30 hover:border-slate-600/50'}`}
                onClick={() => handleSelectAnnotation(ann.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectAnnotation(ann.id)}
              >
                {/* Annotation header */}
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="text-brand-400">{typeIcons[ann.type]}</span>
                  <span className="flex-1 text-slate-300 font-medium">
                    {typeLabels[ann.type]}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLock(ann.id);
                    }}
                    className={`btn-icon w-5 h-5 ${ann.locked ? 'text-red-400' : 'text-slate-500'}`}
                    title={ann.locked ? 'Unlock' : 'Lock'}
                    aria-label={ann.locked ? 'Unlock annotation' : 'Lock annotation'}
                  >
                    {ann.locked ? <Lock size={10} /> : <Unlock size={10} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(ann.id);
                    }}
                    className="btn-icon w-5 h-5 hover:text-red-400"
                    title="Delete"
                    aria-label="Delete annotation"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                {/* Note/text editing */}
                {ann.type === 'text' ? (
                  <div className="px-2.5 pb-2">
                    <textarea
                      className="input-field text-xs resize-none"
                      rows={2}
                      placeholder="Note text…"
                      value={(ann as { text: string }).text || ''}
                      onChange={(e) => handleTextChange(ann.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <div className="px-2.5 pb-2">
                    <textarea
                      className="input-field text-xs resize-none"
                      rows={1}
                      placeholder="Add a note…"
                      value={ann.note}
                      onChange={(e) => handleNoteChange(ann.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {annotations.length > 0 && (
        <div className="border-t border-slate-700/50 px-3 py-2 text-[10px] text-slate-500">
          {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
