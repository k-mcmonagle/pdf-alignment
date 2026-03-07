import { useRef, useCallback, useState } from 'react';
import { Line, Rect, Ellipse, Arrow, Group } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '../../store/useStore';
import type {
  Annotation,
  RectAnnotation,
  EllipseAnnotation,
  ArrowAnnotation,
  LineAnnotation,
  PenAnnotation,
  HighlightAnnotation,
  TextAnnotation,
} from '../../types';
import { uid } from '../../lib/utils';

interface DrawingLayerProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

interface DrawState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points: number[];
}

export function DrawingLayer({ stageRef }: DrawingLayerProps) {
  const activeTool = useStore((s) => s.activeTool);
  const drawStyle = useStore((s) => s.drawStyle);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const setSelectedAnnotationIds = useStore((s) => s.setSelectedAnnotationIds);
  const viewport = useStore((s) => s.viewport);

  const [draw, setDraw] = useState<DrawState | null>(null);
  const pointsRef = useRef<number[]>([]);

  const drawingTools = ['pen', 'rect', 'ellipse', 'arrow', 'line', 'highlight', 'text'];
  const isDrawingTool = drawingTools.includes(activeTool);

  const getRelativePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: (pointer.x - viewport.x) / viewport.zoom,
      y: (pointer.y - viewport.y) / viewport.zoom,
    };
  }, [stageRef, viewport]);

  // We use a transparent rect to capture drawing events on empty areas
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawingTool) return;
      if (e.evt.button !== 0) return;

      const pos = getRelativePointerPosition();

      // Text tool: create note immediately
      if (activeTool === 'text') {
        const ann: TextAnnotation = {
          id: uid(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          stroke: drawStyle.stroke,
          strokeWidth: drawStyle.strokeWidth,
          opacity: drawStyle.opacity,
          fill: '#fef08a',
          locked: false,
          note: '',
          text: 'New note…',
          fontSize: drawStyle.fontSize,
          width: 200,
          height: 120,
          createdAt: Date.now(),
        };
        addAnnotation(ann);
        setSelectedAnnotationIds([ann.id]);
        setActiveTool('select');
        return;
      }

      pointsRef.current = [pos.x, pos.y];
      setDraw({
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
        points: [pos.x, pos.y],
      });
    },
    [isDrawingTool, activeTool, drawStyle, addAnnotation, setActiveTool, setSelectedAnnotationIds, getRelativePointerPosition],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!draw) return;
      const pos = getRelativePointerPosition();

      if (activeTool === 'pen') {
        pointsRef.current = [...pointsRef.current, pos.x, pos.y];
        setDraw((d) =>
          d ? { ...d, currentX: pos.x, currentY: pos.y, points: [...pointsRef.current] } : null,
        );
      } else {
        setDraw((d) => (d ? { ...d, currentX: pos.x, currentY: pos.y } : null));
      }
    },
    [draw, activeTool, getRelativePointerPosition],
  );

  const handleMouseUp = useCallback(() => {
    if (!draw) return;

    const dx = draw.currentX - draw.startX;
    const dy = draw.currentY - draw.startY;
    const minSize = 5;
    const isTooSmall =
      activeTool !== 'pen' && Math.abs(dx) < minSize && Math.abs(dy) < minSize;

    if (!isTooSmall) {
      const base = {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        stroke: drawStyle.stroke,
        strokeWidth: drawStyle.strokeWidth,
        opacity: drawStyle.opacity,
        fill: drawStyle.fill,
        locked: false,
        note: '',
        createdAt: Date.now(),
      };

      let annotation: Annotation | null = null;

      switch (activeTool) {
        case 'pen': {
          annotation = { ...base, id: uid(), type: 'pen', x: 0, y: 0, points: draw.points } as PenAnnotation;
          break;
        }
        case 'rect': {
          annotation = {
            ...base, id: uid(), type: 'rect',
            x: dx >= 0 ? draw.startX : draw.currentX,
            y: dy >= 0 ? draw.startY : draw.currentY,
            width: Math.abs(dx), height: Math.abs(dy),
          } as RectAnnotation;
          break;
        }
        case 'ellipse': {
          annotation = {
            ...base, id: uid(), type: 'ellipse',
            x: draw.startX, y: draw.startY,
            radiusX: Math.abs(dx), radiusY: Math.abs(dy),
          } as EllipseAnnotation;
          break;
        }
        case 'arrow': {
          annotation = {
            ...base, id: uid(), type: 'arrow', x: 0, y: 0,
            points: [draw.startX, draw.startY, draw.currentX, draw.currentY],
          } as ArrowAnnotation;
          break;
        }
        case 'line': {
          annotation = {
            ...base, id: uid(), type: 'line', x: 0, y: 0,
            points: [draw.startX, draw.startY, draw.currentX, draw.currentY],
          } as LineAnnotation;
          break;
        }
        case 'highlight': {
          annotation = {
            ...base, id: uid(), type: 'highlight',
            x: dx >= 0 ? draw.startX : draw.currentX,
            y: dy >= 0 ? draw.startY : draw.currentY,
            width: Math.abs(dx), height: Math.abs(dy),
            stroke: '#facc15', fill: '#facc15', opacity: 0.3,
          } as HighlightAnnotation;
          break;
        }
      }

      if (annotation) {
        addAnnotation(annotation);
        setSelectedAnnotationIds([annotation.id]);
        setActiveTool('select');
      }
    }

    setDraw(null);
    pointsRef.current = [];
  }, [draw, activeTool, drawStyle, addAnnotation, setActiveTool, setSelectedAnnotationIds]);

  if (!isDrawingTool) return null;

  return (
    <Group>
      {/* Transparent overlay to capture mouse events */}
      <Rect
        x={-100000}
        y={-100000}
        width={200000}
        height={200000}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onTouchMove={handleMouseMove as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onTouchEnd={handleMouseUp}
      />

      {/* Live preview shapes */}
      {draw && activeTool === 'pen' && (
        <Line
          points={draw.points}
          stroke={drawStyle.stroke}
          strokeWidth={drawStyle.strokeWidth}
          opacity={drawStyle.opacity}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
      {draw && activeTool === 'rect' && (
        <Rect
          x={Math.min(draw.startX, draw.currentX)}
          y={Math.min(draw.startY, draw.currentY)}
          width={Math.abs(draw.currentX - draw.startX)}
          height={Math.abs(draw.currentY - draw.startY)}
          stroke={drawStyle.stroke}
          strokeWidth={drawStyle.strokeWidth}
          opacity={drawStyle.opacity}
          listening={false}
        />
      )}
      {draw && activeTool === 'highlight' && (
        <Rect
          x={Math.min(draw.startX, draw.currentX)}
          y={Math.min(draw.startY, draw.currentY)}
          width={Math.abs(draw.currentX - draw.startX)}
          height={Math.abs(draw.currentY - draw.startY)}
          fill="rgba(250, 204, 21, 0.3)"
          listening={false}
        />
      )}
      {draw && activeTool === 'ellipse' && (
        <Ellipse
          x={draw.startX}
          y={draw.startY}
          radiusX={Math.abs(draw.currentX - draw.startX)}
          radiusY={Math.abs(draw.currentY - draw.startY)}
          stroke={drawStyle.stroke}
          strokeWidth={drawStyle.strokeWidth}
          opacity={drawStyle.opacity}
          listening={false}
        />
      )}
      {draw && activeTool === 'arrow' && (
        <Arrow
          points={[draw.startX, draw.startY, draw.currentX, draw.currentY]}
          stroke={drawStyle.stroke}
          strokeWidth={drawStyle.strokeWidth}
          fill={drawStyle.stroke}
          opacity={drawStyle.opacity}
          pointerLength={10}
          pointerWidth={10}
          listening={false}
        />
      )}
      {draw && activeTool === 'line' && (
        <Line
          points={[draw.startX, draw.startY, draw.currentX, draw.currentY]}
          stroke={drawStyle.stroke}
          strokeWidth={drawStyle.strokeWidth}
          opacity={drawStyle.opacity}
          listening={false}
        />
      )}
    </Group>
  );
}
