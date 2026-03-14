import type Konva from 'konva';

let canvasStage: Konva.Stage | null = null;

export function setCanvasStage(stage: Konva.Stage | null) {
  canvasStage = stage;
}

export function exportCanvasImageDataUrl(pixelRatio = 2): string | null {
  if (!canvasStage) {
    return null;
  }

  return canvasStage.toDataURL({
    mimeType: 'image/png',
    pixelRatio,
  });
}
