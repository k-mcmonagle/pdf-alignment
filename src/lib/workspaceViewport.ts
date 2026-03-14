import type { CanvasNode, Viewport } from '../types';
import { clamp } from './utils';

export interface ViewportStageSize {
  width: number;
  height: number;
}

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function getViewportForNode(
  node: Pick<CanvasNode, 'x' | 'y' | 'width' | 'height' | 'scaleX' | 'scaleY'>,
  stageSize: ViewportStageSize,
  padding = 100,
  maxZoom = 2,
): Viewport {
  const contentWidth = node.width * node.scaleX;
  const contentHeight = node.height * node.scaleY;
  const zoom = clamp(
    Math.min(
      (stageSize.width - padding * 2) / contentWidth,
      (stageSize.height - padding * 2) / contentHeight,
    ),
    0.1,
    maxZoom,
  );

  const centerX = node.x + contentWidth / 2;
  const centerY = node.y + contentHeight / 2;

  return {
    x: stageSize.width / 2 - centerX * zoom,
    y: stageSize.height / 2 - centerY * zoom,
    zoom,
  };
}

export function getCanvasContentBounds(
  nodes: Pick<CanvasNode, 'x' | 'y' | 'width' | 'height' | 'scaleX' | 'scaleY'>[],
): ContentBounds | null {
  if (nodes.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width * node.scaleX);
    maxY = Math.max(maxY, node.y + node.height * node.scaleY);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
