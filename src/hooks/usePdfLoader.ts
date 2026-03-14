import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  loadPdfDocument,
  renderPdfPage,
  cachePdfDoc,
  removeCachedPdfDoc,
  getRenderedPageKey,
  removeRenderedPagesForDocument,
  setCachedRenderedPage,
} from '../lib/pdf';
import type { CanvasNode } from '../types';
import { uid } from '../lib/utils';
import { getViewportForNode } from '../lib/workspaceViewport';

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

export function usePdfLoader() {
  const addDocument = useStore((s) => s.addDocument);
  const addNode = useStore((s) => s.addNode);
  const removeDocument = useStore((s) => s.removeDocument);
  const removeNodesByDocument = useStore((s) => s.removeNodesByDocument);
  const setLoading = useStore((s) => s.setLoading);
  const setViewport = useStore((s) => s.setViewport);
  const settings = useStore((s) => s.settings);
  const nodes = useStore((s) => s.nodes);

  const loadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const validFiles = files.filter((f) => {
        if (f.size > MAX_FILE_SIZE_BYTES) {
          console.warn(`Skipping "${f.name}": file exceeds 200 MB limit.`);
          return false;
        }
        return true;
      });
      if (validFiles.length === 0) return;

      setLoading(true, `Loading ${validFiles.length} PDF${validFiles.length > 1 ? 's' : ''}…`);

      try {
        // Calculate starting position based on existing nodes
        let startX = 60;
        const shouldFocusFirstLoadedPage = nodes.length === 0;
        let firstLoadedPageFocused = false;
        if (nodes.length > 0) {
          const maxRight = Math.max(...nodes.map((n) => n.x + n.width * n.scaleX));
          startX = maxRight + 60;
        }
        let currentX = startX;

        for (const file of validFiles) {
          setLoading(true, `Loading ${file.name}…`);

          const { doc, pdfDoc, buffer } = await loadPdfDocument(file);
          cachePdfDoc(doc.id, pdfDoc, buffer);
          addDocument(doc);

          // Create canvas nodes for each page and pre-render
          for (const pageInfo of doc.pages) {
            const scale = settings.renderScale;
            const nodeId = uid();

            const node: CanvasNode = {
              id: nodeId,
              documentId: doc.id,
              pageNumber: pageInfo.pageNumber,
              x: currentX,
              y: 60,
              width: pageInfo.width,
              height: pageInfo.height,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              locked: true,
              visible: true,
            };
            addNode(node);

            if (shouldFocusFirstLoadedPage && !firstLoadedPageFocused) {
              const stageEl = document.querySelector('.konvajs-content');
              if (stageEl) {
                setViewport(
                  getViewportForNode(node, {
                    width: stageEl.clientWidth,
                    height: stageEl.clientHeight,
                  }),
                );
                firstLoadedPageFocused = true;
              }
            }

            // Pre-render this page at the configured scale
            try {
              const canvas = await renderPdfPage(pdfDoc, pageInfo.pageNumber, scale);
              const img = new Image();
              img.src = canvas.toDataURL();
              await new Promise<void>((res) => {
                img.onload = () => res();
              });

              const key = getRenderedPageKey(doc.id, pageInfo.pageNumber, scale);
              setCachedRenderedPage(key, img);
            } catch (err) {
              console.warn(`Failed to render page ${pageInfo.pageNumber} of ${file.name}`, err);
            }

            currentX += pageInfo.width + 60;
          }
        }
      } catch (err) {
        console.error('PDF loading error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addDocument, addNode, setLoading, setViewport, settings.renderScale, nodes],
  );

  const removeFile = useCallback(
    (documentId: string) => {
      removeNodesByDocument(documentId);
      removeDocument(documentId);
      removeCachedPdfDoc(documentId);
      removeRenderedPagesForDocument(documentId);
    },
    [removeDocument, removeNodesByDocument],
  );

  return { loadFiles, removeFile };
}
