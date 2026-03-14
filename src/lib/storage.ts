import { get, set, del } from 'idb-keyval';
import type {
  Annotation,
  ArrangeMode,
  DrawStyle,
  ImportedWorkspace,
  MeasureCalibration,
  WorkspaceArchive,
  WorkspaceProject,
  WorkspaceSettings,
} from '../types';
import {
  DEFAULT_DRAW_STYLE,
  DEFAULT_SETTINGS,
  DEFAULT_VIEWPORT,
} from '../types';
import { getDefaultDocumentName } from './utils';

const AUTOSAVE_KEY = 'alignpdf-autosave';
const PDF_BUFFERS_KEY = 'alignpdf-pdf-buffers';
const SETTINGS_KEY = 'alignpdf-settings';
const PROJECT_NAME_MAX_LENGTH = 100;
const WORKSPACE_ARCHIVE_FORMAT = 'alignpdf';
const WORKSPACE_ARCHIVE_VERSION = 1;
const WORKSPACE_PROJECT_VERSION = 2;
const MAX_IMPORT_JSON_SIZE = 350 * 1024 * 1024; // 350 MB
const MAX_EMBEDDED_PDF_BYTES = 250 * 1024 * 1024; // 250 MB raw PDF data

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
}

function sanitizeProjectName(name: unknown): string {
  if (typeof name !== 'string') {
    return 'Imported Workspace';
  }
  const trimmed = name.replace(/\s+/g, ' ').trim();
  return trimmed.slice(0, PROJECT_NAME_MAX_LENGTH) || 'Imported Workspace';
}

function normalizeSettings(settings: unknown): WorkspaceSettings {
  const source = isRecord(settings) ? settings : {};
  return {
    showGrid: typeof source.showGrid === 'boolean' ? source.showGrid : DEFAULT_SETTINGS.showGrid,
    snapToGrid:
      typeof source.snapToGrid === 'boolean' ? source.snapToGrid : DEFAULT_SETTINGS.snapToGrid,
    gridSize: clampNumber(source.gridSize, DEFAULT_SETTINGS.gridSize, 5, 500),
    renderScale: clampNumber(source.renderScale, DEFAULT_SETTINGS.renderScale, 0.5, 3),
    backgroundColor:
      typeof source.backgroundColor === 'string' && source.backgroundColor.trim()
        ? source.backgroundColor
        : DEFAULT_SETTINGS.backgroundColor,
    arrangeGap: clampNumber(source.arrangeGap, DEFAULT_SETTINGS.arrangeGap, 0, 500),
  };
}

function normalizeViewport(viewport: unknown) {
  const source = isRecord(viewport) ? viewport : {};
  return {
    x: clampNumber(source.x, DEFAULT_VIEWPORT.x, -10_000_000, 10_000_000),
    y: clampNumber(source.y, DEFAULT_VIEWPORT.y, -10_000_000, 10_000_000),
    zoom: clampNumber(source.zoom, DEFAULT_VIEWPORT.zoom, 0.02, 10),
  };
}

function normalizeDrawStyle(drawStyle: unknown): DrawStyle {
  const source = isRecord(drawStyle) ? drawStyle : {};
  const dash =
    source.dash === 'solid' || source.dash === 'dashed' || source.dash === 'dotted'
      ? source.dash
      : DEFAULT_DRAW_STYLE.dash;

  return {
    stroke:
      typeof source.stroke === 'string' && source.stroke.trim()
        ? source.stroke
        : DEFAULT_DRAW_STYLE.stroke,
    strokeWidth: clampNumber(source.strokeWidth, DEFAULT_DRAW_STYLE.strokeWidth, 1, 24),
    fill:
      typeof source.fill === 'string' && source.fill.trim()
        ? source.fill
        : DEFAULT_DRAW_STYLE.fill,
    opacity: clampNumber(source.opacity, DEFAULT_DRAW_STYLE.opacity, 0.05, 1),
    fontSize: clampNumber(source.fontSize, DEFAULT_DRAW_STYLE.fontSize, 8, 72),
    dash,
  };
}

function normalizeArrangeMode(value: unknown): ArrangeMode {
  return value === 'horizontal' || value === 'vertical' || value === 'grid'
    ? value
    : 'horizontal';
}

function normalizeMeasureCalibration(value: unknown): MeasureCalibration | null {
  if (!isRecord(value)) {
    return null;
  }

  const unit = typeof value.unit === 'string' && value.unit.trim() ? value.unit : 'm';
  const pixelLength = clampNumber(value.pixelLength, 0, 0.001);
  const realValue = clampNumber(value.realValue, 0, 0.001);

  if (pixelLength <= 0 || realValue <= 0) {
    return null;
  }

  return { pixelLength, realValue, unit };
}

function normalizeDocuments(value: unknown): WorkspaceProject['documents'] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid workspace file: documents are missing.');
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid workspace file: document ${index + 1} is malformed.`);
    }

    const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : '';
    if (!id) {
      throw new Error(`Invalid workspace file: document ${index + 1} is missing an id.`);
    }

    if (!Array.isArray(entry.pages)) {
      throw new Error(`Invalid workspace file: document "${id}" has no pages.`);
    }

    return {
      id,
      fileName:
        typeof entry.fileName === 'string' && entry.fileName.trim()
          ? entry.fileName.slice(0, 255)
          : `Document ${index + 1}.pdf`,
      displayName:
        typeof entry.displayName === 'string' && entry.displayName.trim()
          ? entry.displayName.slice(0, 120)
          : getDefaultDocumentName(
              typeof entry.fileName === 'string' && entry.fileName.trim()
                ? entry.fileName
                : `Document ${index + 1}.pdf`,
            ),
      note: typeof entry.note === 'string' ? entry.note.slice(0, 1000) : '',
      fileSize: clampNumber(entry.fileSize, 0, 0),
      pageCount: clampNumber(entry.pageCount, entry.pages.length, 0),
      fingerprint:
        typeof entry.fingerprint === 'string' && entry.fingerprint.trim()
          ? entry.fingerprint
          : id,
      pages: entry.pages.map((page, pageIndex) => {
        if (!isRecord(page)) {
          throw new Error(
            `Invalid workspace file: page ${pageIndex + 1} in "${id}" is malformed.`,
          );
        }

        return {
          pageNumber: clampNumber(page.pageNumber, pageIndex + 1, 1),
          width: clampNumber(page.width, 1, 1),
          height: clampNumber(page.height, 1, 1),
        };
      }),
    };
  });
}

function normalizeNodes(
  value: unknown,
  documentIds: Set<string>,
): WorkspaceProject['nodes'] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid workspace file: nodes are missing.');
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : '';
      const documentId =
        typeof entry.documentId === 'string' && documentIds.has(entry.documentId)
          ? entry.documentId
          : '';

      if (!id || !documentId) {
        return null;
      }

      return {
        id,
        documentId,
        pageNumber: clampNumber(entry.pageNumber, 1, 1),
        x: clampNumber(entry.x, 0, -10_000_000, 10_000_000),
        y: clampNumber(entry.y, 0, -10_000_000, 10_000_000),
        width: clampNumber(entry.width, 1, 1),
        height: clampNumber(entry.height, 1, 1),
        rotation: clampNumber(entry.rotation, 0, -360_000, 360_000),
        scaleX: clampNumber(entry.scaleX, 1, 0.01, 100),
        scaleY: clampNumber(entry.scaleY, 1, 0.01, 100),
        locked: typeof entry.locked === 'boolean' ? entry.locked : true,
        visible: typeof entry.visible === 'boolean' ? entry.visible : true,
      };
    })
    .filter((entry): entry is WorkspaceProject['nodes'][number] => entry !== null);
}

function normalizeAnnotationBase(entry: Record<string, unknown>) {
  const dash =
    entry.dash === 'solid' || entry.dash === 'dashed' || entry.dash === 'dotted'
      ? entry.dash
      : 'solid';

  return {
    id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : '',
    x: clampNumber(entry.x, 0, -10_000_000, 10_000_000),
    y: clampNumber(entry.y, 0, -10_000_000, 10_000_000),
    rotation: clampNumber(entry.rotation, 0, -360_000, 360_000),
    scaleX: clampNumber(entry.scaleX, 1, 0.01, 100),
    scaleY: clampNumber(entry.scaleY, 1, 0.01, 100),
    stroke:
      typeof entry.stroke === 'string' && entry.stroke.trim() ? entry.stroke : '#ef4444',
    strokeWidth: clampNumber(entry.strokeWidth, 3, 1, 24),
    opacity: clampNumber(entry.opacity, 1, 0.05, 1),
    fill: typeof entry.fill === 'string' && entry.fill.trim() ? entry.fill : 'transparent',
    dash,
    locked: typeof entry.locked === 'boolean' ? entry.locked : false,
    note: typeof entry.note === 'string' ? entry.note.slice(0, 2000) : '',
    createdAt: clampNumber(entry.createdAt, Date.now(), 0),
  };
}

function normalizeAnnotations(value: unknown): Annotation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const type = entry.type;
      const base = normalizeAnnotationBase(entry);
      if (!base.id || typeof type !== 'string') {
        return null;
      }

      switch (type) {
        case 'rect':
          return {
            ...base,
            type,
            width: clampNumber(entry.width, 20, 1),
            height: clampNumber(entry.height, 20, 1),
            cornerRadius: clampNumber(entry.cornerRadius, 0, 0, 200),
          } as Annotation;
        case 'ellipse':
          return {
            ...base,
            type,
            radiusX: clampNumber(entry.radiusX, 10, 1),
            radiusY: clampNumber(entry.radiusY, 10, 1),
          } as Annotation;
        case 'arrow':
        case 'line':
        case 'pen':
          return {
            ...base,
            type,
            points: Array.isArray(entry.points)
              ? entry.points
                  .map((point) => clampNumber(point, 0, -10_000_000, 10_000_000))
                  .filter((point) => Number.isFinite(point))
              : [],
          } as Annotation;
        case 'text':
          return {
            ...base,
            type,
            text: typeof entry.text === 'string' ? entry.text.slice(0, 2000) : '',
            fontSize: clampNumber(entry.fontSize, 16, 8, 72),
            width: clampNumber(entry.width, 200, 20),
            height: clampNumber(entry.height, 120, 20),
          } as Annotation;
        case 'highlight':
          return {
            ...base,
            type,
            width: clampNumber(entry.width, 20, 1),
            height: clampNumber(entry.height, 20, 1),
          } as Annotation;
        case 'measure':
          return {
            ...base,
            type,
            points: Array.isArray(entry.points)
              ? entry.points
                  .map((point) => clampNumber(point, 0, -10_000_000, 10_000_000))
                  .filter((point) => Number.isFinite(point))
              : [],
            pixelLength: clampNumber(entry.pixelLength, 0, 0),
            realLength: typeof entry.realLength === 'string' ? entry.realLength.slice(0, 100) : '',
          } as Annotation;
        default:
          return null;
      }
    })
    .filter((entry): entry is Annotation => entry !== null);
}

export function normalizeWorkspaceProject(data: unknown): WorkspaceProject {
  if (!isRecord(data)) {
    throw new Error('Invalid workspace file.');
  }

  const documents = normalizeDocuments(data.documents);
  const documentIds = new Set(documents.map((document) => document.id));

  return {
    version: WORKSPACE_PROJECT_VERSION,
    name: sanitizeProjectName(data.name),
    createdAt: clampNumber(data.createdAt, Date.now(), 0),
    updatedAt: clampNumber(data.updatedAt, Date.now(), 0),
    settings: normalizeSettings(data.settings),
    documents,
    nodes: normalizeNodes(data.nodes, documentIds),
    annotations: normalizeAnnotations(data.annotations),
    viewport: normalizeViewport(data.viewport),
    measureCalibration: normalizeMeasureCalibration(data.measureCalibration),
    drawStyle: normalizeDrawStyle(data.drawStyle),
    lastArrangeMode: normalizeArrangeMode(data.lastArrangeMode),
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const normalized = base64.trim();
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function estimateBase64Bytes(base64: string): number {
  const normalized = base64.trim();
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

function buildWorkspaceArchive(
  project: WorkspaceProject,
  pdfBuffers: Record<string, ArrayBuffer>,
): WorkspaceArchive {
  const embeddedPdfs = Object.entries(pdfBuffers).reduce<Record<string, string>>(
    (result, [documentId, buffer]) => {
      result[documentId] = arrayBufferToBase64(buffer);
      return result;
    },
    {},
  );

  return {
    format: WORKSPACE_ARCHIVE_FORMAT,
    version: WORKSPACE_ARCHIVE_VERSION,
    exportedAt: Date.now(),
    project: {
      ...project,
      version: WORKSPACE_PROJECT_VERSION,
      updatedAt: Date.now(),
    },
    embeddedPdfs,
  };
}

function unpackWorkspaceArchive(data: unknown): ImportedWorkspace {
  if (!isRecord(data)) {
    throw new Error('Invalid workspace file.');
  }

  const archive = data.format === WORKSPACE_ARCHIVE_FORMAT && isRecord(data.project)
    ? data
    : null;
  const project = normalizeWorkspaceProject(archive ? archive.project : data);
  const embeddedPdfs = archive && isRecord(archive.embeddedPdfs) ? archive.embeddedPdfs : {};
  const expectedDocumentIds = new Set(project.documents.map((document) => document.id));
  const pdfBuffers: Record<string, ArrayBuffer> = {};
  let totalPdfBytes = 0;

  Object.entries(embeddedPdfs).forEach(([documentId, encoded]) => {
    if (!expectedDocumentIds.has(documentId) || typeof encoded !== 'string' || !encoded.trim()) {
      return;
    }

    totalPdfBytes += estimateBase64Bytes(encoded);
    if (totalPdfBytes > MAX_EMBEDDED_PDF_BYTES) {
      throw new Error(
        'Workspace file is too large to import safely. Split the session into smaller groups of PDFs.',
      );
    }

    pdfBuffers[documentId] = base64ToArrayBuffer(encoded);
  });

  return { project, pdfBuffers };
}

/** Save workspace to IndexedDB (autosave) */
export async function autosaveWorkspace(project: WorkspaceProject): Promise<void> {
  await set(AUTOSAVE_KEY, project);
}

/** Save PDF binary buffers to IndexedDB keyed by document id */
export async function savePdfBuffers(buffers: Record<string, ArrayBuffer>): Promise<void> {
  await set(PDF_BUFFERS_KEY, buffers);
}

/** Clear stored PDF binary buffers */
export async function clearPdfBuffers(): Promise<void> {
  await del(PDF_BUFFERS_KEY);
}

/** Load saved PDF binary buffers from IndexedDB */
export async function loadPdfBuffers(): Promise<Record<string, ArrayBuffer> | null> {
  const data = await get<Record<string, ArrayBuffer>>(PDF_BUFFERS_KEY);
  return data ?? null;
}

/** Load autosaved workspace from IndexedDB */
export async function loadAutosave(): Promise<WorkspaceProject | null> {
  const data = await get<unknown>(AUTOSAVE_KEY);
  if (!data) {
    return null;
  }
  try {
    return normalizeWorkspaceProject(data);
  } catch {
    await Promise.all([clearAutosave(), clearPdfBuffers()]);
    return null;
  }
}

/** Clear autosave */
export async function clearAutosave(): Promise<void> {
  await del(AUTOSAVE_KEY);
}

/** Clear all persisted workspace state */
export async function clearPersistedWorkspace(): Promise<void> {
  await Promise.all([clearAutosave(), clearPdfBuffers()]);
  localStorage.removeItem('alignpdf-emergency-save');
}

/** Save app settings */
export async function saveAppSettings(settings: Record<string, unknown>): Promise<void> {
  await set(SETTINGS_KEY, settings);
}

/** Load app settings */
export async function loadAppSettings(): Promise<Record<string, unknown> | null> {
  const data = await get<Record<string, unknown>>(SETTINGS_KEY);
  return data ?? null;
}

/** Export project as downloadable JSON */
export function downloadProjectJson(
  project: WorkspaceProject,
  pdfBuffers: Record<string, ArrayBuffer>,
) {
  const totalPdfBytes = Object.values(pdfBuffers).reduce((total, buffer) => total + buffer.byteLength, 0);
  if (totalPdfBytes > MAX_EMBEDDED_PDF_BYTES) {
    throw new Error(
      'This session is too large to export as one self-contained file. Split it into smaller sets of PDFs first.',
    );
  }

  const sanitizedName = project.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'workspace';
  const archive = buildWorkspaceArchive(project, pdfBuffers);
  const json = JSON.stringify(archive, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizedName}.alignpdf.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import project from a JSON file */
export function importProjectJson(file: File): Promise<ImportedWorkspace> {
  if (file.size > MAX_IMPORT_JSON_SIZE) {
    return Promise.reject(new Error('Project file exceeds the 350 MB size limit'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(unpackWorkspaceArchive(data));
      } catch (error) {
        if (error instanceof Error) {
          reject(error);
          return;
        }
        reject(new Error('Failed to parse project file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/** Export canvas as PNG image */
export function downloadImage(dataUrl: string, filename = 'alignpdf-export.png') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Prevent CSV formula injection by prefixing cells that start with formula-triggering characters */
function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/** Export annotations as CSV */
export function downloadAnnotationsCsv(
  annotations: { type: string; note: string; x: number; y: number; createdAt: number }[],
) {
  const header = 'Type,Note,X,Y,Created\n';
  const rows = annotations
    .map(
      (a) =>
        `"${sanitizeCsvCell(a.type)}","${sanitizeCsvCell((a.note || '').replace(/"/g, '""'))}",${a.x.toFixed(0)},${a.y.toFixed(0)},${new Date(a.createdAt).toISOString()}`,
    )
    .join('\n');
  const csv = header + rows;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'alignpdf-annotations.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Escape XML special characters */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Export annotations as XLSX (Excel) using SpreadsheetML */
export function downloadAnnotationsXlsx(
  annotations: {
    type: string;
    note: string;
    text?: string;
    realLength?: string;
    x: number;
    y: number;
    createdAt: number;
  }[],
) {
  // Build the sheet XML
  const headers = ['Type', 'Note / Text', 'Measurement', 'X', 'Y', 'Created'];
  let sheetRows = '<row r="1">';
  headers.forEach((h, i) => {
    const col = String.fromCharCode(65 + i);
    sheetRows += `<c r="${col}1" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`;
  });
  sheetRows += '</row>';

  annotations.forEach((ann, idx) => {
    const r = idx + 2;
    const noteText = ann.text || ann.note || '';
    const measurement = ann.realLength || '';
    const created = new Date(ann.createdAt).toISOString();
    sheetRows += `<row r="${r}">`;
    sheetRows += `<c r="A${r}" t="inlineStr"><is><t>${escapeXml(ann.type)}</t></is></c>`;
    sheetRows += `<c r="B${r}" t="inlineStr"><is><t>${escapeXml(noteText)}</t></is></c>`;
    sheetRows += `<c r="C${r}" t="inlineStr"><is><t>${escapeXml(measurement)}</t></is></c>`;
    sheetRows += `<c r="D${r}"><v>${ann.x.toFixed(0)}</v></c>`;
    sheetRows += `<c r="E${r}"><v>${ann.y.toFixed(0)}</v></c>`;
    sheetRows += `<c r="F${r}" t="inlineStr"><is><t>${escapeXml(created)}</t></is></c>`;
    sheetRows += '</row>';
  });

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheetRows}</sheetData>
</worksheet>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Annotations" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  // Build the ZIP using the minimal ZIP spec (no compression - store only)
  const enc = new TextEncoder();
  const files: { path: string; data: Uint8Array }[] = [
    { path: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { path: '_rels/.rels', data: enc.encode(rels) },
    { path: 'xl/workbook.xml', data: enc.encode(workbook) },
    { path: 'xl/_rels/workbook.xml.rels', data: enc.encode(workbookRels) },
    { path: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ];

  const blob = buildZipBlob(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'alignpdf-annotations.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a minimal ZIP blob (store method, no compression) */
function buildZipBlob(files: { path: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.path);
    const crc = crc32(file.data);

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // sig
    lv.setUint16(4, 20, true);          // version needed
    lv.setUint16(6, 0, true);           // flags
    lv.setUint16(8, 0, true);           // compression: store
    lv.setUint16(10, 0, true);          // mod time
    lv.setUint16(12, 0, true);          // mod date
    lv.setUint32(14, crc, true);        // crc32
    lv.setUint32(18, file.data.length, true); // compressed size
    lv.setUint32(22, file.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // name length
    lv.setUint16(28, 0, true);          // extra length
    localHeader.set(nameBytes, 30);

    // Central directory entry
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdEntry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0x20, true); // external attrs
    cv.setUint32(42, offset, true);
    cdEntry.set(nameBytes, 46);
    centralDir.push(cdEntry);

    parts.push(localHeader);
    parts.push(file.data);
    offset += localHeader.length + file.data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) {
    parts.push(cd);
    cdSize += cd.length;
  }

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  ev.setUint16(20, 0, true);
  parts.push(eocd);

  return new Blob(parts as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Simple CRC32 implementation */
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
