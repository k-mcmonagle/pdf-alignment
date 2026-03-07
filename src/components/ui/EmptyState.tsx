import { useRef, useCallback } from 'react';
import { FileText, Upload, Shield, Keyboard } from 'lucide-react';
import { usePdfLoader } from '../../hooks/usePdfLoader';

export function EmptyState() {
  const { loadFiles } = usePdfLoader();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) await loadFiles(files);
      e.target.value = '';
    },
    [loadFiles],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf',
      );
      if (files.length > 0) await loadFiles(files);
    },
    [loadFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="max-w-lg w-full mx-8">
        <div className="text-center space-y-6">
          {/* Hero */}
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600/10 border border-brand-500/20">
              <FileText size={32} className="text-brand-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-200">
              Welcome to ChartDeck
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Review alignment chart PDFs side by side on an infinite canvas.
              Drop your files to get started.
            </p>
          </div>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-slate-600/60 rounded-xl p-8 
                       hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <Upload size={24} className="mx-auto mb-3 text-slate-500" />
            <p className="text-sm text-slate-300 font-medium">
              Drop PDF files here or click to browse
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports multiple files · Single or multi-page PDFs
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Feature hints */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-800/40">
              <Shield size={16} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-300">100% Local</p>
                <p className="text-[11px] text-slate-500">
                  All files stay on your device. Nothing is uploaded.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-800/40">
              <Keyboard size={16} className="text-brand-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-300">Shortcuts</p>
                <p className="text-[11px] text-slate-500">
                  V select · H pan · R rect · P pen · T note
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
