import { useState, useCallback, useEffect, useRef } from 'react';
import { Ruler, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function CalibrationDialog() {
  const pendingCalibrationPixels = useStore((s) => s.pendingCalibrationPixels);
  const setPendingCalibrationPixels = useStore((s) => s.setPendingCalibrationPixels);
  const setMeasureCalibration = useStore((s) => s.setMeasureCalibration);
  const measureCalibration = useStore((s) => s.measureCalibration);

  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(measureCalibration?.unit || 'm');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingCalibrationPixels !== null) {
      // Auto-focus the input when dialog opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pendingCalibrationPixels]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const num = parseFloat(value);
      if (!num || num <= 0 || pendingCalibrationPixels === null) return;

      setMeasureCalibration({
        pixelLength: pendingCalibrationPixels,
        realValue: num,
        unit,
      });
      setPendingCalibrationPixels(null);
      setValue('');
    },
    [value, unit, pendingCalibrationPixels, setMeasureCalibration, setPendingCalibrationPixels],
  );

  const handleCancel = useCallback(() => {
    setPendingCalibrationPixels(null);
    setValue('');
  }, [setPendingCalibrationPixels]);

  if (pendingCalibrationPixels === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-96 max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <Ruler size={18} className="text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-100">Calibrate Measurement</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Draw a line along a known distance on the chart, then enter the real length.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="btn-icon w-7 h-7"
            aria-label="Cancel calibration"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-3 py-2.5">
            <div className="text-xs text-slate-400">Drawn line</div>
            <div className="flex-1 text-right text-sm font-mono text-cyan-400">
              {pendingCalibrationPixels.toFixed(1)} px
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium mb-1.5 block">
              What real-world distance does this line represent?
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="number"
                step="any"
                min="0.001"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 10"
                className="input-field flex-1 text-sm"
                required
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="input-field w-24 text-sm"
              >
                <option value="m">metres</option>
                <option value="ft">feet</option>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="km">km</option>
                <option value="in">inches</option>
                <option value="yd">yards</option>
                <option value="nm">naut. mi</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleCancel} className="btn-secondary flex-1 text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 text-xs" disabled={!value || parseFloat(value) <= 0}>
              Calibrate
            </button>
          </div>
        </form>

        {/* Current calibration info */}
        {measureCalibration && (
          <div className="px-5 pb-4">
            <div className="text-[10px] text-slate-500 bg-slate-700/30 rounded px-2.5 py-1.5">
              Current calibration: {measureCalibration.pixelLength.toFixed(1)} px = {measureCalibration.realValue} {measureCalibration.unit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
