import { useCallback, useRef } from 'react';
import {
  Save,
  FolderOpen,
  Image,
  FileDown,
  FileSpreadsheet,
  Grid3x3,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  clearPersistedWorkspace,
  downloadAnnotationsCsv,
  downloadAnnotationsXlsx,
  downloadImage,
  downloadProjectJson,
  importProjectJson,
} from '../../lib/storage';
import { exportCanvasImageDataUrl } from '../../lib/canvasExport';
import {
  clearPdfCache,
  clearRenderedPageCache,
  getBuffersForDocumentIds,
  restorePdfFromBuffer,
} from '../../lib/pdf';

export function TopBar() {
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const getProject = useStore((s) => s.getProject);
  const loadProject = useStore((s) => s.loadProject);
  const resetWorkspace = useStore((s) => s.resetWorkspace);
  const isDirty = useStore((s) => s.isDirty);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const annotations = useStore((s) => s.annotations);
  const setLoading = useStore((s) => s.setLoading);

  const importRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    const project = getProject();
    const pdfBuffers = getBuffersForDocumentIds(project.documents.map((document) => document.id));
    const missingDocuments = project.documents
      .filter((document) => !pdfBuffers[document.id])
      .map((document) => document.fileName);

    setLoading(true, 'Saving workspace…');

    try {
      if (missingDocuments.length > 0) {
        throw new Error(
          `Cannot export a complete session because these PDFs are not available locally: ${missingDocuments.join(', ')}`,
        );
      }

      downloadProjectJson(project, pdfBuffers);
    } catch (err) {
      alert(`Failed to save workspace: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [getProject, setLoading]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setLoading(true, 'Loading workspace…');
        const imported = await importProjectJson(file);

        clearPdfCache();
        clearRenderedPageCache();

        for (const [documentId, buffer] of Object.entries(imported.pdfBuffers)) {
          await restorePdfFromBuffer(documentId, buffer);
        }

        loadProject(imported.project);

        if (
          imported.project.documents.length > 0 &&
          Object.keys(imported.pdfBuffers).length === 0
        ) {
          alert(
            'This workspace file uses the older lightweight format and does not contain embedded PDFs. Layout and annotations loaded, but page images will not render until those PDFs exist in this browser again.',
          );
        }
      } catch (err) {
        alert(`Failed to load workspace: ${(err as Error).message}`);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    },
    [loadProject, setLoading],
  );

  const handleExportImage = useCallback(() => {
    const dataUrl = exportCanvasImageDataUrl();
    if (dataUrl) {
      downloadImage(dataUrl);
    }
  }, []);

  const handleExportAnnotations = useCallback(() => {
    if (annotations.length === 0) return;
    downloadAnnotationsCsv(
      annotations.map((a) => ({
        type: a.type,
        note: a.note,
        x: a.x,
        y: a.y,
        createdAt: a.createdAt,
      })),
    );
  }, [annotations]);

  const handleExportExcel = useCallback(() => {
    if (annotations.length === 0) return;
    downloadAnnotationsXlsx(
      annotations.map((a) => ({
        type: a.type,
        note: a.note,
        text: (a as { text?: string }).text,
        realLength: (a as { realLength?: string }).realLength,
        x: a.x,
        y: a.y,
        createdAt: a.createdAt,
      })),
    );
  }, [annotations]);

  const handleReset = useCallback(async () => {
    if (window.confirm('Reset workspace? All unsaved changes will be lost.')) {
      setLoading(true, 'Resetting workspace…');

      try {
        resetWorkspace();
        clearPdfCache();
        clearRenderedPageCache();
        await clearPersistedWorkspace();
      } finally {
        setLoading(false);
      }
    }
  }, [resetWorkspace, setLoading]);

  return (
    <div className="h-10 bg-slate-900 border-b border-slate-700/50 flex items-center px-3 gap-2 z-20 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <img src="/favicon.svg" alt="" className="w-5 h-5" />
        <span className="text-sm font-bold text-brand-400 tracking-tight">AlignPDF</span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-slate-700" />

      {/* Project name */}
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        maxLength={100}
        className="bg-transparent border-none text-sm text-slate-300 font-medium w-48 
                   focus:outline-none focus:ring-1 focus:ring-brand-500/50 rounded px-1.5 py-0.5
                   hover:bg-slate-800 transition-colors"
        aria-label="Project name"
      />
      {isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings toggles */}
      <button
        onClick={() => updateSettings({ showGrid: !settings.showGrid })}
        className={`btn-icon ${settings.showGrid ? 'text-brand-400' : ''}`}
        title={`Grid: ${settings.showGrid ? 'On' : 'Off'}`}
        aria-label="Toggle grid"
      >
        <Grid3x3 size={15} />
      </button>

      <button
        onClick={() => updateSettings({ snapToGrid: !settings.snapToGrid })}
        className={`btn-icon ${settings.snapToGrid ? 'text-brand-400' : ''}`}
        title={`Snap to grid: ${settings.snapToGrid ? 'On' : 'Off'}`}
        aria-label="Toggle snap to grid"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="6" height="6" rx="0.5" />
          <rect x="9" y="9" width="6" height="6" rx="0.5" />
          <path d="M4 7v2m0 0v2m0-2H2m2 0h2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="w-px h-5 bg-slate-700" />

      {/* Actions */}
      <button onClick={handleSave} className="btn-ghost text-xs" title="Save complete session (JSON)">
        <Save size={14} />
        Save
      </button>

      <input
        ref={importRef}
        type="file"
        accept=".json,.alignpdf.json"
        className="hidden"
        onChange={handleImport}
      />
      <button
        onClick={() => importRef.current?.click()}
        className="btn-ghost text-xs"
        title="Load session"
      >
        <FolderOpen size={14} />
        Load
      </button>

      <div className="w-px h-5 bg-slate-700" />

      <button onClick={handleExportImage} className="btn-icon" title="Export canvas as PNG">
        <Image size={14} />
      </button>

      {annotations.length > 0 && (
        <button
          onClick={handleExportAnnotations}
          className="btn-icon"
          title="Export annotations as CSV"
        >
          <FileDown size={14} />
        </button>
      )}

      {annotations.length > 0 && (
        <button
          onClick={handleExportExcel}
          className="btn-icon"
          title="Export annotations as Excel"
        >
          <FileSpreadsheet size={14} />
        </button>
      )}

      <button onClick={handleReset} className="btn-icon" title="Reset workspace">
        <RotateCcw size={14} />
      </button>

      {/* Privacy badge */}
      <div className="w-px h-5 bg-slate-700" />
      <div
        className="flex items-center gap-1 text-[10px] text-emerald-400/70 cursor-help"
        title="All files stay on your device. No data is uploaded anywhere."
      >
        <Shield size={12} />
        <span className="hidden xl:inline">Local only</span>
      </div>
    </div>
  );
}
