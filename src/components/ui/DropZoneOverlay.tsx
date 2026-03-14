import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { usePdfLoader } from '../../hooks/usePdfLoader';

export function DropZoneOverlay({ children }: { children: React.ReactNode }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { loadFiles } = usePdfLoader();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only leave if actually exiting the container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf',
      );
      if (files.length > 0) {
        await loadFiles(files);
      }
    },
    [loadFiles],
  );

  return (
    <div
      className="relative flex-1 flex min-w-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-brand-600/10 backdrop-blur-[2px] border-2 border-dashed border-brand-400/50 rounded-lg m-2 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Upload size={32} className="mx-auto text-brand-400" />
            <p className="text-sm font-medium text-brand-300">Drop PDFs here</p>
          </div>
        </div>
      )}
    </div>
  );
}
