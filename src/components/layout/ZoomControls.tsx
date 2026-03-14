import { Plus, Minus, Maximize2, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { clamp } from '../../lib/utils';
import { getCanvasContentBounds } from '../../lib/workspaceViewport';

export function ZoomControls() {
  const viewport = useStore((s) => s.viewport);
  const setViewport = useStore((s) => s.setViewport);
  const nodes = useStore((s) => s.nodes);

  const zoomIn = () => {
    const newZoom = clamp(viewport.zoom * 1.25, 0.02, 10);
    // Zoom to center of stage
    const stageEl = document.querySelector('.konvajs-content');
    if (stageEl) {
      const cx = stageEl.clientWidth / 2;
      const cy = stageEl.clientHeight / 2;
      const worldX = (cx - viewport.x) / viewport.zoom;
      const worldY = (cy - viewport.y) / viewport.zoom;
      setViewport({
        zoom: newZoom,
        x: cx - worldX * newZoom,
        y: cy - worldY * newZoom,
      });
    } else {
      setViewport({ zoom: newZoom });
    }
  };

  const zoomOut = () => {
    const newZoom = clamp(viewport.zoom / 1.25, 0.02, 10);
    const stageEl = document.querySelector('.konvajs-content');
    if (stageEl) {
      const cx = stageEl.clientWidth / 2;
      const cy = stageEl.clientHeight / 2;
      const worldX = (cx - viewport.x) / viewport.zoom;
      const worldY = (cy - viewport.y) / viewport.zoom;
      setViewport({
        zoom: newZoom,
        x: cx - worldX * newZoom,
        y: cy - worldY * newZoom,
      });
    } else {
      setViewport({ zoom: newZoom });
    }
  };

  const resetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  const fitAll = () => {
    if (nodes.length === 0) {
      resetView();
      return;
    }

    const stageEl = document.querySelector('.konvajs-content');
    if (!stageEl) return;

    const bounds = getCanvasContentBounds(nodes);
    if (!bounds) return;

    const contentW = bounds.width;
    const contentH = bounds.height;
    const padding = 80;

    const scaleX = (stageEl.clientWidth - padding * 2) / contentW;
    const scaleY = (stageEl.clientHeight - padding * 2) / contentH;
    const zoom = clamp(Math.min(scaleX, scaleY), 0.02, 2);

    const centerX = bounds.minX + contentW / 2;
    const centerY = bounds.minY + contentH / 2;

    setViewport({
      zoom,
      x: stageEl.clientWidth / 2 - centerX * zoom,
      y: stageEl.clientHeight / 2 - centerY * zoom,
    });
  };

  return (
    <div className="absolute bottom-8 right-8 z-20 flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-1 shadow-lg">
      <button onClick={zoomOut} className="btn-icon w-7 h-7" title="Zoom out" aria-label="Zoom out">
        <Minus size={14} />
      </button>
      <span
        className="text-[11px] text-slate-300 w-12 text-center font-mono cursor-pointer select-none"
        onClick={resetView}
        title="Reset zoom to 100%"
      >
        {Math.round(viewport.zoom * 100)}%
      </span>
      <button onClick={zoomIn} className="btn-icon w-7 h-7" title="Zoom in" aria-label="Zoom in">
        <Plus size={14} />
      </button>
      <div className="w-px h-4 bg-slate-600" />
      <button onClick={fitAll} className="btn-icon w-7 h-7" title="Fit all" aria-label="Fit all documents in view">
        <Maximize2 size={14} />
      </button>
      <button onClick={resetView} className="btn-icon w-7 h-7" title="Reset view" aria-label="Reset view">
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
