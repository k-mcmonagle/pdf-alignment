import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '../../store/useStore';
import {
  getCachedRenderedPage,
  getRenderedPageKey,
  getCachedPdfDoc,
  renderPdfPage,
  setCachedRenderedPage,
} from '../../lib/pdf';
import { AnnotationRenderer } from '../annotations/AnnotationRenderer';
import { DrawingLayer } from '../annotations/DrawingLayer';
import { clamp, snapToGrid } from '../../lib/utils';

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [renderedImages, setRenderedImages] = useState<
    Map<string, HTMLImageElement>
  >(new Map());

  const nodes = useStore((s) => s.nodes);
  const updateNode = useStore((s) => s.updateNode);
  const settings = useStore((s) => s.settings);
  const viewport = useStore((s) => s.viewport);
  const setViewport = useStore((s) => s.setViewport);
  const activeTool = useStore((s) => s.activeTool);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);
  const selectedAnnotationIds = useStore((s) => s.selectedAnnotationIds);
  const setSelectedAnnotationIds = useStore((s) => s.setSelectedAnnotationIds);
  const documents = useStore((s) => s.documents);

  // ─── Resize handling ───────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Render PDF pages as images ────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function renderAll() {
      const newImages = new Map<string, HTMLImageElement>();

      for (const node of nodes) {
        const key = getRenderedPageKey(node.documentId, node.pageNumber, settings.renderScale);
        const cached = getCachedRenderedPage(key);

        if (cached) {
          newImages.set(node.id, cached);
          continue;
        }

        // Need to render
        const pdfDoc = getCachedPdfDoc(node.documentId);
        if (!pdfDoc) continue;

        try {
          const canvas = await renderPdfPage(pdfDoc, node.pageNumber, settings.renderScale);
          const img = new Image();
          img.src = canvas.toDataURL();
          await new Promise<void>((res) => {
            img.onload = () => res();
          });

          if (cancelled) return;
          setCachedRenderedPage(key, img);
          newImages.set(node.id, img);
        } catch {
          // skip
        }
      }

      if (!cancelled) {
        setRenderedImages(newImages);
      }
    }

    renderAll();
    return () => {
      cancelled = true;
    };
  }, [nodes, settings.renderScale]);

  // ─── Transformer sync ─────────────────────────────────
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    const allIds = [...selectedNodeIds, ...selectedAnnotationIds];
    const selected = allIds
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

    tr.nodes(selected);
    tr.getLayer()?.batchDraw();
  }, [selectedNodeIds, selectedAnnotationIds]);

  // ─── Wheel zoom ────────────────────────────────────────
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const scaleBy = 1.08;
      const oldZoom = viewport.zoom;
      const pointer = stage.getPointerPosition()!;

      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldZoom,
        y: (pointer.y - viewport.y) / oldZoom,
      };

      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const newZoom = clamp(
        direction > 0 ? oldZoom * scaleBy : oldZoom / scaleBy,
        0.02,
        10,
      );

      const newX = pointer.x - mousePointTo.x * newZoom;
      const newY = pointer.y - mousePointTo.y * newZoom;

      setViewport({ x: newX, y: newY, zoom: newZoom });
    },
    [viewport, setViewport],
  );

  // ─── Panning via hand tool or middle mouse ─────────────
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Middle mouse button always pans
      if (e.evt.button === 1 || activeTool === 'hand') {
        isPanningRef.current = true;
        panStartRef.current = { x: e.evt.clientX - viewport.x, y: e.evt.clientY - viewport.y };
        e.evt.preventDefault();
        return;
      }

      // Click on empty stage → deselect
      if (activeTool === 'select' && e.target === stageRef.current) {
        setSelectedNodeIds([]);
        setSelectedAnnotationIds([]);
      }
    },
    [activeTool, viewport, setSelectedNodeIds, setSelectedAnnotationIds],
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanningRef.current) {
        setViewport({
          x: e.evt.clientX - panStartRef.current.x,
          y: e.evt.clientY - panStartRef.current.y,
        });
      }
    },
    [setViewport],
  );

  const handleStageMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // ─── Node click handling ──────────────────────────────
  const handleNodeClick = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== 'select') return;

      const multi = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
      if (multi) {
        const isSelected = selectedNodeIds.includes(nodeId);
        if (isSelected) {
          setSelectedNodeIds(selectedNodeIds.filter((id) => id !== nodeId));
        } else {
          setSelectedNodeIds([...selectedNodeIds, nodeId]);
        }
      } else {
        setSelectedNodeIds([nodeId]);
        setSelectedAnnotationIds([]);
      }
    },
    [activeTool, selectedNodeIds, setSelectedNodeIds, setSelectedAnnotationIds],
  );

  // ─── Node drag ─────────────────────────────────────────
  const handleNodeDragEnd = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      let x = e.target.x();
      let y = e.target.y();

      if (settings.snapToGrid) {
        x = snapToGrid(x, settings.gridSize);
        y = snapToGrid(y, settings.gridSize);
        e.target.x(x);
        e.target.y(y);
      }

      updateNode(nodeId, { x, y });
    },
    [updateNode, settings.snapToGrid, settings.gridSize],
  );

  // ─── Grid background ──────────────────────────────────
  const gridPatternSize = settings.gridSize;

  // ─── Cursor ────────────────────────────────────────────
  const cursorMap: Record<string, string> = {
    select: 'default',
    hand: isPanningRef.current ? 'grabbing' : 'grab',
    pen: 'crosshair',
    rect: 'crosshair',
    ellipse: 'crosshair',
    arrow: 'crosshair',
    line: 'crosshair',
    text: 'text',
    highlight: 'crosshair',
    measure: 'crosshair',
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden min-h-0"
      style={{ cursor: cursorMap[activeTool] || 'default' }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.x}
        y={viewport.y}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        {/* Grid layer */}
        {settings.showGrid && (
          <Layer listening={false}>
            <GridPattern
              width={stageSize.width}
              height={stageSize.height}
              gridSize={gridPatternSize}
              zoom={viewport.zoom}
              offsetX={viewport.x}
              offsetY={viewport.y}
            />
          </Layer>
        )}

        {/* PDF pages layer */}
        <Layer>
          {nodes.map((node) => {
            const img = renderedImages.get(node.id);
            const doc = documents.find((d) => d.id === node.documentId);
            const isSelected = selectedNodeIds.includes(node.id);

            return (
              <Group
                key={node.id}
                id={node.id}
                x={node.x}
                y={node.y}
                rotation={node.rotation}
                scaleX={node.scaleX}
                scaleY={node.scaleY}
                draggable={!node.locked && activeTool === 'select'}
                onClick={(e) => handleNodeClick(node.id, e)}
                onTap={(e) => handleNodeClick(node.id, e as unknown as Konva.KonvaEventObject<MouseEvent>)}
                onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
              >
                {/* White page background */}
                <Rect
                  width={node.width}
                  height={node.height}
                  fill="#ffffff"
                  shadowColor="black"
                  shadowBlur={12}
                  shadowOpacity={0.25}
                  shadowOffsetX={4}
                  shadowOffsetY={4}
                  cornerRadius={2}
                />
                {/* Rendered PDF image */}
                {img && (
                  <KonvaImage
                    image={img}
                    width={node.width}
                    height={node.height}
                  />
                )}
                {/* Filename label */}
                {doc && viewport.zoom > 0.15 && (
                  <Rect
                    y={node.height + 4}
                    width={node.width}
                    height={20}
                    fill="transparent"
                  />
                )}
                {/* Selection highlight */}
                {isSelected && (
                  <Rect
                    width={node.width}
                    height={node.height}
                    stroke="#3b82f6"
                    strokeWidth={2 / (viewport.zoom * node.scaleX)}
                    dash={[8 / viewport.zoom, 4 / viewport.zoom]}
                    listening={false}
                  />
                )}
                {/* Lock indicator */}
                {node.locked && (
                  <Rect
                    x={node.width - 20}
                    y={4}
                    width={16}
                    height={16}
                    fill="rgba(0,0,0,0.5)"
                    cornerRadius={3}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}

          {/* Annotations */}
          <AnnotationRenderer />

          {/* Drawing layer (for active drawing) */}
          <DrawingLayer stageRef={stageRef} />

          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            borderStroke="#3b82f6"
            borderStrokeWidth={1.5}
            anchorFill="#3b82f6"
            anchorStroke="#1e40af"
            anchorSize={8}
            anchorCornerRadius={2}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 10 || newBox.height < 10) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}

// ─── Grid Pattern Component ────────────────────────────────
function GridPattern({
  width,
  height,
  gridSize,
  zoom,
  offsetX,
  offsetY,
}: {
  width: number;
  height: number;
  gridSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}) {
  // Calculate grid lines that are visible in the current viewport
  const scaled = gridSize;
  const startX = Math.floor(-offsetX / zoom / scaled) * scaled - scaled;
  const startY = Math.floor(-offsetY / zoom / scaled) * scaled - scaled;
  const endX = startX + width / zoom + scaled * 2;
  const endY = startY + height / zoom + scaled * 2;

  const lines: JSX.Element[] = [];
  let key = 0;

  for (let x = startX; x <= endX; x += scaled) {
    lines.push(
      <Rect
        key={key++}
        x={x}
        y={startY}
        width={0.5 / zoom}
        height={endY - startY}
        fill="rgba(148, 163, 184, 0.15)"
        listening={false}
      />,
    );
  }

  for (let y = startY; y <= endY; y += scaled) {
    lines.push(
      <Rect
        key={key++}
        x={startX}
        y={y}
        width={endX - startX}
        height={0.5 / zoom}
        fill="rgba(148, 163, 184, 0.15)"
        listening={false}
      />,
    );
  }

  return <>{lines}</>;
}
