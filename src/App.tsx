import { useEffect } from 'react';
import { TopBar } from './components/layout/TopBar';
import { Toolbar } from './components/layout/Toolbar';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { RightSidebar } from './components/layout/RightSidebar';
import { ZoomControls } from './components/layout/ZoomControls';
import { Canvas } from './features/canvas/Canvas';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { EmptyState } from './components/ui/EmptyState';
import { DropZoneOverlay } from './components/ui/DropZoneOverlay';
import { CalibrationDialog } from './components/ui/CalibrationDialog';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutosave } from './hooks/useAutosave';
import { useStore } from './store/useStore';
import { loadAutosave, loadPdfBuffers, normalizeWorkspaceProject } from './lib/storage';
import { restorePdfFromBuffer } from './lib/pdf';

export default function App() {
  const documents = useStore((s) => s.documents);
  const loadProject = useStore((s) => s.loadProject);
  const hasDocuments = documents.length > 0;

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Autosave
  useAutosave();

  // Load autosaved workspace on mount
  useEffect(() => {
    async function restore() {
      let project = await loadAutosave();

      // Fall back to the emergency localStorage save if IndexedDB had nothing
      if (!project?.documents?.length) {
        try {
          const raw = localStorage.getItem('alignpdf-emergency-save');
          if (raw) {
            const parsed = normalizeWorkspaceProject(JSON.parse(raw));
            if (parsed?.documents?.length > 0) {
              project = parsed;
            }
          }
        } catch {
          // Ignore parse errors — corrupt data is silently discarded
        }
      }

      // Always remove the emergency save to avoid stale data accumulating
      localStorage.removeItem('alignpdf-emergency-save');

      if (project && project.documents?.length > 0) {
        // Restore PDF binary buffers before loading project so pages can render
        const buffers = await loadPdfBuffers();
        if (buffers) {
          for (const docId of Object.keys(buffers)) {
            try {
              await restorePdfFromBuffer(docId, buffers[docId]);
            } catch (err) {
              console.warn(`Failed to restore PDF buffer for ${docId}:`, err);
            }
          }
        }
        loadProject(project);
      }
    }
    restore();
  }, [loadProject]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top bar */}
      <TopBar />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left tool strip */}
        <Toolbar />

        {/* Left sidebar (documents) */}
        <LeftSidebar />

        {/* Canvas area */}
        <DropZoneOverlay>
          <div className="flex-1 flex flex-col relative min-w-0" style={{ backgroundColor: '#1a2332' }}>
            <Canvas />
            {!hasDocuments && <EmptyState />}
            <ZoomControls />
          </div>
        </DropZoneOverlay>

        {/* Right sidebar (annotations) */}
        <RightSidebar />
      </div>

      {/* Loading overlay */}
      <LoadingOverlay />

      {/* Calibration dialog */}
      <CalibrationDialog />
    </div>
  );
}
