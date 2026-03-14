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
  MeasureAnnotation,
} from '../../types';
import { getDashArray } from '../../types';
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
  shiftKey: boolean;
}

/**
 * Constrain dx/dy so the shape is a perfect square / circle when Shift is held.
 */
function constrainToSquare(
  startX: number, startY: number, currentX: number, currentY: number,
): { cx: number; cy: number } {
  const dx = currentX - startX;
  const dy = currentY - startY;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    cx: startX + size * Math.sign(dx || 1),
    cy: startY + size * Math.sign(dy || 1),
  };
}

/** Constrain a line to the nearest 45° increment when Shift is held. */
function constrainAngle(
  startX: number, startY: number, currentX: number, currentY: number,
): { cx: number; cy: number } {
  const dx = currentX - startX;
  const dy = currentY - startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return {
    cx: startX + len * Math.cos(snapped),
    cy: startY + len * Math.sin(snapped),
  };
}

export function DrawingLayer({ stageRef }: DrawingLayerProps) {
  const activeTool = useStore((s) => s.activeTool);
  const drawStyle = useStore((s) => s.drawStyle);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const setSelectedAnnotationIds = useStore((s) => s.setSelectedAnnotationIds);
  const viewport = useStore((s) => s.viewport);
  const measureCalibration = useStore((s) => s.measureCalibration);
  const setPendingCalibrationPixels = useStore((s) => s.setPendingCalibrationPixels);

  const [draw, setDraw] = useState<DrawState | null>(null);
  const pointsRef = useRef<number[]>([]);

  const drawingTools = ['pen', 'rect', 'ellipse', 'arrow', 'line', 'highlight', 'text', 'measure'];
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
          dash: 'solid',
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
        shiftKey: e.evt.shiftKey,
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
          d ? { ...d, currentX: pos.x, currentY: pos.y, points: [...pointsRef.current], shiftKey: e.evt.shiftKey } : null,
        );
      } else {
        setDraw((d) => (d ? { ...d, currentX: pos.x, currentY: pos.y, shiftKey: e.evt.shiftKey } : null));
      }
    },
    [draw, activeTool, getRelativePointerPosition],
  );

  const handleMouseUp = useCallback(() => {
    if (!draw) return;

    // Apply shift constraints for the final shape
    let endX = draw.currentX;
    let endY = draw.currentY;

    if (draw.shiftKey) {
      if (activeTool === 'rect' || activeTool === 'ellipse' || activeTool === 'highlight') {
        const c = constrainToSquare(draw.startX, draw.startY, draw.currentX, draw.currentY);
        endX = c.cx;
        endY = c.cy;
      } else if (activeTool === 'arrow' || activeTool === 'line' || activeTool === 'measure') {
        const c = constrainAngle(draw.startX, draw.startY, draw.currentX, draw.currentY);
        endX = c.cx;
        endY = c.cy;
      }
    }

    const dx = endX - draw.startX;
    const dy = endY - draw.startY;
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
        dash: drawStyle.dash,
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
            x: dx >= 0 ? draw.startX : endX,
            y: dy >= 0 ? draw.startY : endY,
            width: Math.abs(dx), height: Math.abs(dy),
            cornerRadius: 0,
          } as RectAnnotation;
          break;
        }
        case 'ellipse': {
          // Bounding-box approach: ellipse center is the midpoint
          const x = Math.min(draw.startX, endX);
          const y = Math.min(draw.startY, endY);
          const w = Math.abs(dx);
          const h = Math.abs(dy);
          annotation = {
            ...base, id: uid(), type: 'ellipse',
            x: x + w / 2,
            y: y + h / 2,
            radiusX: w / 2,
            radiusY: h / 2,
          } as EllipseAnnotation;
          break;
        }
        case 'arrow': {
          annotation = {
            ...base, id: uid(), type: 'arrow', x: 0, y: 0,
            points: [draw.startX, draw.startY, endX, endY],
          } as ArrowAnnotation;
          break;
        }
        case 'line': {
          annotation = {
            ...base, id: uid(), type: 'line', x: 0, y: 0,
            points: [draw.startX, draw.startY, endX, endY],
          } as LineAnnotation;
          break;
        }
        case 'highlight': {
          annotation = {
            ...base, id: uid(), type: 'highlight',
            x: dx >= 0 ? draw.startX : endX,
            y: dy >= 0 ? draw.startY : endY,
            width: Math.abs(dx), height: Math.abs(dy),
            stroke: '#facc15', fill: '#facc15', opacity: 0.3,
          } as HighlightAnnotation;
          break;
        }
        case 'measure': {
          const pixelLength = Math.sqrt(dx * dx + dy * dy);
          if (!measureCalibration) {
            setPendingCalibrationPixels(pixelLength);
            setDraw(null);
            pointsRef.current = [];
            return;
          }
          const realDist = (pixelLength / measureCalibration.pixelLength) * measureCalibration.realValue;
          const realLength = `${realDist.toFixed(2)} ${measureCalibration.unit}`;
          annotation = {
            ...base, id: uid(), type: 'measure', x: 0, y: 0,
            points: [draw.startX, draw.startY, endX, endY],
            pixelLength,
            realLength,
            stroke: '#22d3ee',
          } as MeasureAnnotation;
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
  }, [draw, activeTool, drawStyle, addAnnotation, setActiveTool, setSelectedAnnotationIds, measureCalibration, setPendingCalibrationPixels]);

  if (!isDrawingTool) return null;

  // Compute preview positions with shift constraints
  let previewEndX = draw?.currentX ?? 0;
  let previewEndY = draw?.currentY ?? 0;
  if (draw?.shiftKey) {
    if (activeTool === 'rect' || activeTool === 'ellipse' || activeTool === 'highlight') {
      const c = constrainToSquare(draw.startX, draw.startY, draw.currentX, draw.currentY);
      previewEndX = c.cx;
      previewEndY = c.cy;
    } else if (activeTool === 'arrow' || activeTool === 'line' || activeTool === 'measure') {
      const c = constrainAngle(draw.startX, draw.startY, draw.currentX, draw.currentY);
      previewEndX = c.cx;
      previewEndY = c.cy;
    }
  }

  const dashArr = getDashArray(drawStyle.dash, drawStyle.strokeWidth);

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
          dash={dashArr}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
      {draw && activeTool === 'rect' && (
        <Rect
          x={Math.min(draw.startX, previewEndX)}
          y={Math.min(draw.startY, previewEndY)}
          width={Math.abs(previewEndX - draw.startX)}
          height={Math.abs(previewEndY - draw.startY)}
          stroke={drawStyle.stroke}
          strokeWidth={drawStyle.strokeWidth}
          fill={drawStyle.fill === 'transparent' ? undefined : drawStyle.fill}
          opacity={drawStyle.opacity}
          dash={dashArr}
          listening={false}
        />
      )}
      {draw && activeTool === 'highlight' && (
        <Rect
          x={Math.min(draw.startX, previewEndX)}
          y={Math.min(draw.startY, previewEndY)}
          width={Math.abs(previewEndX - draw.startX)}
          height={Math.abs(previewEndY - draw.startY)}
          fill="rgba(250, 204, 21, 0.3)"
          listening={false}
        />
      )}
      {draw && activeTool === 'ellipse' && (() => {
        const ex = Math.min(draw.startX, previewEndX);
        const ey = Math.min(draw.startY, previewEndY);
        const ew = Math.abs(previewEndX - draw.startX);
        const eh = Math.abs(previewEndY - draw.startY);
        return (
          <Ellipse
            x={ex + ew / 2}
            y={ey + eh / 2}
            radiusX={ew / 2}
            radiusY={eh / 2}
            stroke={drawStyle.stroke}
            strokeWidth={drawStyle.strokeWidth}
            fill={drawStyle.fill === 'transparent' ? undefined : drawStyle.fill}
            opacity={drawStyle.opacity}
            dash={dashArr}
            listening={false}
          />
        );
      })()}
      {draw && activeTool === 'arrow' && (
        <Arrow
          points={[draw.startX, draw.startY, previewEndX, previewEndY]}
          stroke={drawStyle.stroke}
          strokeWidth={drawStyle.strokeWidth}
          fill={drawStyle.stroke}
          opacity={drawStyle.opacity}
          dash={dashArr}
          pointerLength={10}
          pointerWidth={10}
          listening={false}
        />
      )}
      {draw && activeTool === 'line' && (
        <Line
          points={[draw.startX, draw.startY, previewEndX, previewEndY]}
          stroke={drawStyle.stroke}
          strokeWidth={drawStyle.strokeWidth}
          opacity={drawStyle.opacity}
          dash={dashArr}
          listening={false}
        />
      )}
      {draw && activeTool === 'measure' && (
        <>
          <Line
            points={[draw.startX, draw.startY, previewEndX, previewEndY]}
            stroke="#22d3ee"
            strokeWidth={2}
            dash={[8, 4]}
            listening={false}
          />
          <Line
            points={(() => {
              const ddx = previewEndX - draw.startX;
              const ddy = previewEndY - draw.startY;
              const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
              const nx = -ddy / len * 6;
              const ny = ddx / len * 6;
              return [draw.startX + nx, draw.startY + ny, draw.startX - nx, draw.startY - ny];
            })()}
            stroke="#22d3ee"
            strokeWidth={2}
            listening={false}
          />
          <Line
            points={(() => {
              const ddx = previewEndX - draw.startX;
              const ddy = previewEndY - draw.startY;
              const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
              const nx = -ddy / len * 6;
              const ny = ddx / len * 6;
              return [previewEndX + nx, previewEndY + ny, previewEndX - nx, previewEndY - ny];
            })()}
            stroke="#22d3ee"
            strokeWidth={2}
            listening={false}
          />
        </>
      )}
    </Group>
  );
}
