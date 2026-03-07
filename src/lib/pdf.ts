import * as pdfjsLib from 'pdfjs-dist';
import type { PdfDocument, PdfPageInfo } from '../types';

// Configure worker - use CDN for reliable loading
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/** Generate a hex fingerprint from file content */
async function hashFile(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Load a PDF file and extract metadata */
export async function loadPdfDocument(file: File): Promise<{
  doc: PdfDocument;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  buffer: ArrayBuffer;
}> {
  const buffer = await file.arrayBuffer();
  const fingerprint = await hashFile(buffer);

  const pdfDoc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;

  const pages: PdfPageInfo[] = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    pages.push({ pageNumber: i, width: vp.width, height: vp.height });
  }

  const doc: PdfDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    fileSize: file.size,
    pageCount: pdfDoc.numPages,
    pages,
    fingerprint,
  };

  return { doc, pdfDoc, buffer };
}

/** Render a single PDF page to an OffscreenCanvas or regular canvas and return ImageBitmap */
export async function renderPdfPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas;
}

/** Render a smaller thumbnail for the sidebar */
export async function renderPdfThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  maxWidth = 200,
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const vp = page.getViewport({ scale: 1 });
  const scale = maxWidth / vp.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas.toDataURL('image/jpeg', 0.7);
}

// ─── PDF Document Cache ────────────────────────────────────
// Keep loaded PDFDocumentProxy instances in memory keyed by document id
const pdfCache = new Map<string, pdfjsLib.PDFDocumentProxy>();
const bufferCache = new Map<string, ArrayBuffer>();

export function cachePdfDoc(docId: string, pdfDoc: pdfjsLib.PDFDocumentProxy, buffer: ArrayBuffer) {
  pdfCache.set(docId, pdfDoc);
  bufferCache.set(docId, buffer);
}

export function getCachedPdfDoc(docId: string): pdfjsLib.PDFDocumentProxy | undefined {
  return pdfCache.get(docId);
}

export function removeCachedPdfDoc(docId: string) {
  const doc = pdfCache.get(docId);
  if (doc) doc.destroy();
  pdfCache.delete(docId);
  bufferCache.delete(docId);
}

export function clearPdfCache() {
  pdfCache.forEach((doc) => doc.destroy());
  pdfCache.clear();
  bufferCache.clear();
}

// ─── Rendered page image cache ─────────────────────────────
// Store data URLs of rendered pages keyed by `${docId}-${pageNum}-${scale}`
const renderedPageCache = new Map<string, HTMLImageElement>();

export function getRenderedPageKey(docId: string, pageNum: number, scale: number) {
  return `${docId}-${pageNum}-${scale.toFixed(2)}`;
}

export function getCachedRenderedPage(key: string): HTMLImageElement | undefined {
  return renderedPageCache.get(key);
}

export function setCachedRenderedPage(key: string, img: HTMLImageElement) {
  renderedPageCache.set(key, img);
}

export function clearRenderedPageCache() {
  renderedPageCache.clear();
}
