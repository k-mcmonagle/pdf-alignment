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
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutosave } from './hooks/useAutosave';
import { useStore } from './store/useStore';
import { loadAutosave } from './lib/storage';

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
    loadAutosave().then((project) => {
      if (project && project.documents?.length > 0) {
        loadProject(project);
      }
    });
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
          <div className="flex-1 relative" style={{ backgroundColor: '#1a2332' }}>
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
    </div>
  );
}
