import {
  MousePointer2,
  Hand,
  Pen,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  Highlighter,
  Ruler,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ToolType } from '../../types';

const tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
  { id: 'hand', icon: <Hand size={18} />, label: 'Pan', shortcut: 'H' },
  { id: 'pen', icon: <Pen size={18} />, label: 'Freehand', shortcut: 'P' },
  { id: 'rect', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: <Circle size={18} />, label: 'Ellipse', shortcut: 'E' },
  { id: 'arrow', icon: <ArrowRight size={18} />, label: 'Arrow', shortcut: 'A' },
  { id: 'line', icon: <Minus size={18} />, label: 'Line', shortcut: 'L' },
  { id: 'text', icon: <Type size={18} />, label: 'Sticky Note', shortcut: 'T' },
  { id: 'highlight', icon: <Highlighter size={18} />, label: 'Highlight', shortcut: '' },
  { id: 'measure', icon: <Ruler size={18} />, label: 'Measure', shortcut: 'M' },
];

export function Toolbar() {
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const measureCalibration = useStore((s) => s.measureCalibration);
  const setMeasureCalibration = useStore((s) => s.setMeasureCalibration);

  return (
    <div className="w-12 bg-slate-800 border-r border-slate-700/50 flex flex-col items-center py-2 gap-1 z-20 shrink-0">
      {tools.map((tool, i) => (
        <div key={tool.id}>
          {(i === 2 || tool.id === 'measure') && (
            <div className="w-7 h-px bg-slate-600/50 my-1" />
          )}
          <button
            className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}${tool.id === 'measure' && measureCalibration ? ` (calibrated: ${measureCalibration.realValue} ${measureCalibration.unit})` : tool.id === 'measure' ? ' (not calibrated)' : ''}`}
            aria-label={tool.label}
          >
            {tool.icon}
          </button>
        </div>
      ))}
      {/* Calibration indicator */}
      {measureCalibration && (
        <>
          <div className="w-7 h-px bg-slate-600/50 my-1" />
          <button
            onClick={() => {
              if (window.confirm('Clear measurement calibration?')) {
                setMeasureCalibration(null);
              }
            }}
            className="w-9 h-5 rounded text-[8px] font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors cursor-pointer flex items-center justify-center"
            title={`Calibrated: ${measureCalibration.realValue} ${measureCalibration.unit} — Click to reset`}
          >
            CAL
          </button>
        </>
      )}
    </div>
  );
}
