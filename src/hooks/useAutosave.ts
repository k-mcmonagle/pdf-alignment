import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { autosaveWorkspace } from '../lib/storage';

/** Autosave workspace to IndexedDB when dirty, debounced */
export function useAutosave(intervalMs = 5000) {
  const getProject = useStore((s) => s.getProject);
  const isDirty = useStore((s) => s.isDirty);
  const markClean = useStore((s) => s.markClean);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback(async () => {
    if (!isDirty) return;
    try {
      const project = getProject();
      await autosaveWorkspace(project);
      markClean();
    } catch (err) {
      console.warn('Autosave failed:', err);
    }
  }, [isDirty, getProject, markClean]);

  useEffect(() => {
    timerRef.current = setInterval(save, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [save, intervalMs]);

  // Also save on beforeunload
  useEffect(() => {
    const handleUnload = () => {
      if (isDirty) {
        const project = getProject();
        // Synchronous best-effort save via localStorage fallback
        try {
          localStorage.setItem('chartdeck-emergency-save', JSON.stringify(project));
        } catch {
          // quota exceeded — ignore
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [isDirty, getProject]);
}
