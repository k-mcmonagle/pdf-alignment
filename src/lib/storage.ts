import { get, set, del } from 'idb-keyval';
import type { WorkspaceProject } from '../types';

const AUTOSAVE_KEY = 'alignpdf-autosave';
const PDF_BUFFERS_KEY = 'alignpdf-pdf-buffers';
const SETTINGS_KEY = 'alignpdf-settings';

/** Save workspace to IndexedDB (autosave) */
export async function autosaveWorkspace(project: WorkspaceProject): Promise<void> {
  await set(AUTOSAVE_KEY, project);
}

/** Save PDF binary buffers to IndexedDB keyed by document id */
export async function savePdfBuffers(buffers: Record<string, ArrayBuffer>): Promise<void> {
  await set(PDF_BUFFERS_KEY, buffers);
}

/** Load saved PDF binary buffers from IndexedDB */
export async function loadPdfBuffers(): Promise<Record<string, ArrayBuffer> | null> {
  const data = await get<Record<string, ArrayBuffer>>(PDF_BUFFERS_KEY);
  return data ?? null;
}

/** Load autosaved workspace from IndexedDB */
export async function loadAutosave(): Promise<WorkspaceProject | null> {
  const data = await get<WorkspaceProject>(AUTOSAVE_KEY);
  return data ?? null;
}

/** Clear autosave */
export async function clearAutosave(): Promise<void> {
  await del(AUTOSAVE_KEY);
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
export function downloadProjectJson(project: WorkspaceProject) {
  const sanitizedName = project.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'workspace';
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizedName}.alignpdf.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const MAX_IMPORT_JSON_SIZE = 50 * 1024 * 1024; // 50 MB

/** Import project from a JSON file */
export function importProjectJson(file: File): Promise<WorkspaceProject> {
  if (file.size > MAX_IMPORT_JSON_SIZE) {
    return Promise.reject(new Error('Project file exceeds the 50 MB size limit'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (
          typeof data.version !== 'string' ||
          !Array.isArray(data.documents) ||
          !Array.isArray(data.nodes)
        ) {
          reject(new Error('Invalid AlignPDF project file'));
          return;
        }
        // Sanitize and clamp the project name from the imported file
        data.name =
          typeof data.name === 'string' ? data.name.slice(0, 100) : 'Imported Project';
        // Ensure annotations is always an array
        if (!Array.isArray(data.annotations)) {
          data.annotations = [];
        }
        resolve(data as WorkspaceProject);
      } catch {
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
