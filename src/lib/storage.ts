import { get, set, del } from 'idb-keyval';
import type { WorkspaceProject } from '../types';

const AUTOSAVE_KEY = 'chartdeck-autosave';
const SETTINGS_KEY = 'chartdeck-settings';

/** Save workspace to IndexedDB (autosave) */
export async function autosaveWorkspace(project: WorkspaceProject): Promise<void> {
  await set(AUTOSAVE_KEY, project);
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
  a.download = `${sanitizedName}.chartdeck.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import project from a JSON file */
export function importProjectJson(file: File): Promise<WorkspaceProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.version || !data.documents || !data.nodes) {
          reject(new Error('Invalid ChartDeck project file'));
          return;
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
export function downloadImage(dataUrl: string, filename = 'chartdeck-export.png') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Export annotations as CSV */
export function downloadAnnotationsCsv(
  annotations: { type: string; note: string; x: number; y: number; createdAt: number }[],
) {
  const header = 'Type,Note,X,Y,Created\n';
  const rows = annotations
    .map(
      (a) =>
        `"${a.type}","${(a.note || '').replace(/"/g, '""')}",${a.x.toFixed(0)},${a.y.toFixed(0)},${new Date(a.createdAt).toISOString()}`,
    )
    .join('\n');
  const csv = header + rows;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chartdeck-annotations.csv';
  a.click();
  URL.revokeObjectURL(url);
}
