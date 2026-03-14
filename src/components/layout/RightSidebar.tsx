import { useCallback, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
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
  Ruler,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Palette,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Annotation, ShapeType, DashStyle } from '../../types';

const typeIcons: Record<ShapeType, React.ReactNode> = {
  rect: <Square size={14} />,
  ellipse: <Circle size={14} />,
  arrow: <ArrowRight size={14} />,
  line: <Minus size={14} />,
  pen: <Pen size={14} />,
  text: <Type size={14} />,
  highlight: <Highlighter size={14} />,
  measure: <Ruler size={14} />,
};

const typeLabels: Record<ShapeType, string> = {
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  arrow: 'Arrow',
  line: 'Line',
  pen: 'Freehand',
  text: 'Note',
  highlight: 'Highlight',
  measure: 'Measurement',
};

// Shapes that support fill
const fillableTypes: ShapeType[] = ['rect', 'ellipse'];
// Shapes that support dash
const dashableTypes: ShapeType[] = ['rect', 'ellipse', 'arrow', 'line', 'pen'];
// Shapes that support corner radius
const cornerRadiusTypes: ShapeType[] = ['rect'];

export function RightSidebar() {
  const annotations = useStore((s) => s.annotations);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const duplicateAnnotation = useStore((s) => s.duplicateAnnotation);
  const bringToFront = useStore((s) => s.bringToFront);
  const sendToBack = useStore((s) => s.sendToBack);
  const bringForward = useStore((s) => s.bringForward);
  const sendBackward = useStore((s) => s.sendBackward);
  const selectedAnnotationIds = useStore((s) => s.selectedAnnotationIds);
  const setSelectedAnnotationIds = useStore((s) => s.setSelectedAnnotationIds);
  const rightSidebarOpen = useStore((s) => s.rightSidebarOpen);
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar);
  const drawStyle = useStore((s) => s.drawStyle);
  const setDrawStyle = useStore((s) => s.setDrawStyle);

  const [drawStyleOpen, setDrawStyleOpen] = useState(false);
  const [expandedAnnotationId, setExpandedAnnotationId] = useState<string | null>(null);

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
      setExpandedAnnotationId((current) => (current === id ? null : current));
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

  const handleToggleAnnotationProps = useCallback(
    (id: string) => {
      setSelectedAnnotationIds([id]);
      setExpandedAnnotationId((current) => (current === id ? null : id));
    },
    [setSelectedAnnotationIds],
  );

  const activeExpandedAnnotationId = annotations.some(
    (annotation) => annotation.id === expandedAnnotationId,
  )
    ? expandedAnnotationId
    : null;

  if (!rightSidebarOpen) {
    return (
      <div className="w-10 bg-slate-800/95 border-l border-slate-700/50 flex flex-col items-center pt-3 shrink-0 z-10">
        <button
          onClick={toggleRightSidebar}
          className="btn-icon bg-slate-700 border border-slate-600"
          title="Open annotations panel"
          aria-label="Open annotations panel"
        >
          <MessageSquare size={16} />
        </button>
      </div>
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

      {/* Draw style (for new shapes) — collapsible */}
      <div className="sidebar-section">
        <button
          onClick={() => setDrawStyleOpen(!drawStyleOpen)}
          className="flex items-center gap-2 w-full text-left group"
        >
          {drawStyleOpen ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
          <Palette size={12} className="text-slate-400" />
          <span className="panel-heading px-0 pt-0 pb-0 flex-1">New Shape Style</span>
          <span
            className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
            style={{ backgroundColor: drawStyle.stroke }}
          />
        </button>
        {drawStyleOpen && <div className="space-y-2 mt-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 w-14">Stroke</label>
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
          <label className="text-xs text-slate-400 w-14">Fill</label>
          <input
            type="color"
            value={drawStyle.fill === 'transparent' ? '#000000' : drawStyle.fill}
            onChange={(e) => setDrawStyle({ fill: e.target.value })}
            className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent"
            title="Fill color"
          />
          <button
            onClick={() => setDrawStyle({ fill: 'transparent' })}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              drawStyle.fill === 'transparent'
                ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                : 'border-slate-600 text-slate-500 hover:text-slate-300'
            }`}
            title="No fill"
          >
            None
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 w-14">Opacity</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={drawStyle.opacity}
            onChange={(e) => setDrawStyle({ opacity: Number(e.target.value) })}
            className="flex-1 accent-brand-500"
            title={`Opacity: ${Math.round(drawStyle.opacity * 100)}%`}
          />
          <span className="text-xs text-slate-500 w-8">
            {Math.round(drawStyle.opacity * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 w-14">Line</label>
          <div className="flex gap-1">
            {(['solid', 'dashed', 'dotted'] as DashStyle[]).map((d) => (
              <button
                key={d}
                onClick={() => setDrawStyle({ dash: d })}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                  drawStyle.dash === d
                    ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                    : 'border-slate-600 text-slate-500 hover:text-slate-300'
                }`}
                title={`${d} line`}
              >
                {d === 'solid' ? '———' : d === 'dashed' ? '– – –' : '· · · ·'}
              </button>
            ))}
          </div>
        </div>
        </div>}
      </div>

      {/* Annotations list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm text-center gap-2">
            <StickyNote size={28} className="opacity-40" />
            <p className="text-xs">No annotations yet</p>
            <p className="text-[10px] text-slate-600">
              Use the drawing tools to add markups.
              <br />Hold <kbd className="bg-slate-700 px-1 rounded text-[9px]">Shift</kbd> for perfect squares / circles.
            </p>
          </div>
        ) : (
          <>
            {annotations.map((ann) => {
            const isSelected = selectedAnnotationIds.includes(ann.id);
            const isExpanded = activeExpandedAnnotationId === ann.id;
            const swatchColor =
              ann.type === 'text'
                ? ann.fill === 'transparent'
                  ? '#fef08a'
                  : ann.fill
                : ann.stroke;
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
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAnnotationProps(ann.id);
                    }}
                    className={`h-5 w-5 rounded-full border-2 shrink-0 transition-all ${
                      isExpanded
                        ? 'border-brand-400 ring-2 ring-brand-500/25'
                        : 'border-slate-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: swatchColor }}
                    title={`Edit ${typeLabels[ann.type]} style`}
                    aria-label={`Edit ${typeLabels[ann.type]} style`}
                  />
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

                {isExpanded && (
                  <div
                    className="mx-2.5 mb-2 space-y-2 rounded-md border border-slate-700/60 bg-slate-900/45 p-2"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button onClick={() => bringToFront(ann.id)} className="btn-icon h-6 w-6 text-slate-400" title="Bring to front"><ChevronsUp size={12} /></button>
                      <button onClick={() => bringForward(ann.id)} className="btn-icon h-6 w-6 text-slate-400" title="Bring forward"><ArrowUp size={12} /></button>
                      <button onClick={() => sendBackward(ann.id)} className="btn-icon h-6 w-6 text-slate-400" title="Send backward"><ArrowDown size={12} /></button>
                      <button onClick={() => sendToBack(ann.id)} className="btn-icon h-6 w-6 text-slate-400" title="Send to back"><ChevronsDown size={12} /></button>
                      <div className="flex-1" />
                      <button onClick={() => duplicateAnnotation(ann.id)} className="btn-icon h-6 w-6 text-slate-400" title="Duplicate (Ctrl+D)"><Copy size={12} /></button>
                    </div>

                    {ann.type !== 'text' && ann.type !== 'highlight' && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-14">Stroke</label>
                        <input
                          type="color"
                          value={ann.stroke}
                          onChange={(e) => updateAnnotation(ann.id, { stroke: e.target.value })}
                          className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent"
                        />
                        <input
                          type="range"
                          min="1"
                          max="12"
                          value={ann.strokeWidth}
                          onChange={(e) => updateAnnotation(ann.id, { strokeWidth: Number(e.target.value) })}
                          className="flex-1 accent-brand-500"
                        />
                        <span className="text-xs text-slate-500 w-5">{ann.strokeWidth}</span>
                      </div>
                    )}

                    {ann.type === 'highlight' && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-14">Color</label>
                        <input
                          type="color"
                          value={ann.stroke}
                          onChange={(e) =>
                            updateAnnotation(ann.id, {
                              stroke: e.target.value,
                              fill: e.target.value,
                            })
                          }
                          className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent"
                        />
                      </div>
                    )}

                    {ann.type === 'text' && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-14">Paper</label>
                        <input
                          type="color"
                          value={ann.fill === 'transparent' ? '#fef08a' : ann.fill}
                          onChange={(e) => updateAnnotation(ann.id, { fill: e.target.value })}
                          className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent"
                        />
                      </div>
                    )}

                    {fillableTypes.includes(ann.type) && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-14">Fill</label>
                        <input
                          type="color"
                          value={ann.fill === 'transparent' ? '#000000' : ann.fill}
                          onChange={(e) => updateAnnotation(ann.id, { fill: e.target.value })}
                          className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent"
                        />
                        <button
                          onClick={() => updateAnnotation(ann.id, { fill: 'transparent' })}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                            ann.fill === 'transparent'
                              ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                              : 'border-slate-600 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          None
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 w-14">Opacity</label>
                      <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={ann.opacity}
                        onChange={(e) => updateAnnotation(ann.id, { opacity: Number(e.target.value) })}
                        className="flex-1 accent-brand-500"
                      />
                      <span className="text-xs text-slate-500 w-8">
                        {Math.round(ann.opacity * 100)}%
                      </span>
                    </div>

                    {dashableTypes.includes(ann.type) && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-14">Line</label>
                        <div className="flex gap-1">
                          {(['solid', 'dashed', 'dotted'] as DashStyle[]).map((d) => (
                            <button
                              key={d}
                              onClick={() => updateAnnotation(ann.id, { dash: d })}
                              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                                (ann.dash ?? 'solid') === d
                                  ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                                  : 'border-slate-600 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {d === 'solid' ? '———' : d === 'dashed' ? '– – –' : '· · · ·'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {cornerRadiusTypes.includes(ann.type) && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-14">Radius</label>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={(ann as { cornerRadius?: number }).cornerRadius ?? 0}
                          onChange={(e) =>
                            updateAnnotation(ann.id, {
                              cornerRadius: Number(e.target.value),
                            } as Partial<Annotation>)
                          }
                          className="flex-1 accent-brand-500"
                        />
                        <span className="text-xs text-slate-500 w-5">
                          {(ann as { cornerRadius?: number }).cornerRadius ?? 0}
                        </span>
                      </div>
                    )}

                    {ann.type === 'text' && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-14">Font</label>
                        <input
                          type="range"
                          min="8"
                          max="48"
                          value={(ann as { fontSize: number }).fontSize}
                          onChange={(e) =>
                            updateAnnotation(ann.id, {
                              fontSize: Number(e.target.value),
                            } as Partial<Annotation>)
                          }
                          className="flex-1 accent-brand-500"
                        />
                        <span className="text-xs text-slate-500 w-5">
                          {(ann as { fontSize: number }).fontSize}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 w-14">Rotate</label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={Math.round(ann.rotation)}
                        onChange={(e) => updateAnnotation(ann.id, { rotation: Number(e.target.value) })}
                        className="flex-1 accent-brand-500"
                      />
                      <span className="text-xs text-slate-500 w-8">
                        {Math.round(ann.rotation)}°
                      </span>
                    </div>
                  </div>
                )}

                {/* Note/text editing */}
                {ann.type === 'measure' ? (
                  <div className="px-2.5 pb-2">
                    <div className="text-xs text-cyan-400 font-mono mb-1">
                      {(ann as { realLength: string }).realLength}
                    </div>
                    <textarea
                      className="input-field text-xs resize-none"
                      rows={1}
                      placeholder="Add a note…"
                      maxLength={2000}
                      value={ann.note}
                      onChange={(e) => handleNoteChange(ann.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : ann.type === 'text' ? (
                  <div className="px-2.5 pb-2">
                    <textarea
                      className="input-field text-xs resize-none"
                      rows={2}
                      placeholder="Note text…"
                      maxLength={2000}
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
                      maxLength={2000}
                      value={ann.note}
                      onChange={(e) => handleNoteChange(ann.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            );
          })}
          </>
        )}
      </div>

      {/* Summary */}
      {annotations.length > 0 && (
        <div className="border-t border-slate-700/50 px-3 py-2 text-[10px] text-slate-500">
          {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
          {selectedAnnotationIds.length > 0 && ` · ${selectedAnnotationIds.length} selected`}
        </div>
      )}
    </div>
  );
}
