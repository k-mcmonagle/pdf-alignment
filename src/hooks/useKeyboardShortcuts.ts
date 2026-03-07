import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { ToolType } from '../types';

export function useKeyboardShortcuts() {
  const setActiveTool = useStore((s) => s.setActiveTool);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const selectedAnnotationIds = useStore((s) => s.selectedAnnotationIds);
  const removeNode = useStore((s) => s.removeNode);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);
  const setSelectedAnnotationIds = useStore((s) => s.setSelectedAnnotationIds);

  const deleteSelectedRef = useRef<() => void>();
  deleteSelectedRef.current = () => {
    if (selectedAnnotationIds.length > 0) {
      selectedAnnotationIds.forEach((id) => removeAnnotation(id));
      setSelectedAnnotationIds([]);
    }
    if (selectedNodeIds.length > 0) {
      selectedNodeIds.forEach((id) => removeNode(id));
      setSelectedNodeIds([]);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const toolMap: Record<string, ToolType> = {
        v: 'select',
        h: 'hand',
        p: 'pen',
        r: 'rect',
        e: 'ellipse',
        a: 'arrow',
        l: 'line',
        t: 'text',
      };

      if (toolMap[e.key]) {
        e.preventDefault();
        setActiveTool(toolMap[e.key]);
        return;
      }

      if (e.key === 'Delete' || (e.key === 'Backspace' && !e.metaKey)) {
        e.preventDefault();
        deleteSelectedRef.current?.();
        return;
      }

      // Escape → deselect
      if (e.key === 'Escape') {
        setSelectedNodeIds([]);
        setSelectedAnnotationIds([]);
        setActiveTool('select');
      }
    },
    [setActiveTool, setSelectedNodeIds, setSelectedAnnotationIds],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
