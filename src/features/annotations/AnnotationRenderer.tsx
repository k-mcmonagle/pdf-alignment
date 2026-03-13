import { useRef, useEffect, useCallback } from 'react';
import { Rect, Ellipse, Arrow, Line, Group, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '../../store/useStore';
import type { Annotation, MeasureAnnotation, RectAnnotation, EllipseAnnotation } from '../../types';
import { getDashArray } from '../../types';

function AnnotationShape({ ann }: { ann: Annotation }) {
  const shapeRef = useRef<Konva.Node>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const activeTool = useStore((s) => s.activeTool);
  const selectedAnnotationIds = useStore((s) => s.selectedAnnotationIds);
  const setSelectedAnnotationIds = useStore((s) => s.setSelectedAnnotationIds);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);

  const isSelected = selectedAnnotationIds.includes(ann.id) && activeTool === 'select';

  // Sync transformer with selection
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'select') return;
    e.cancelBubble = true;
    const multi = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    if (multi) {
      const isSel = selectedAnnotationIds.includes(ann.id);
      if (isSel) {
        setSelectedAnnotationIds(selectedAnnotationIds.filter((a) => a !== ann.id));
      } else {
        setSelectedAnnotationIds([...selectedAnnotationIds, ann.id]);
      }
    } else {
      setSelectedAnnotationIds([ann.id]);
      setSelectedNodeIds([]);
    }
  }, [activeTool, ann.id, selectedAnnotationIds, setSelectedAnnotationIds, setSelectedNodeIds]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    updateAnnotation(ann.id, { x: e.target.x(), y: e.target.y() });
  }, [ann.id, updateAnnotation]);

  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;

    // For rects and highlights: bake scale into width/height
    if (ann.type === 'rect' || ann.type === 'highlight') {
      const rect = ann as RectAnnotation;
      updateAnnotation(ann.id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(5, rect.width * node.scaleX()),
        height: Math.max(5, rect.height * node.scaleY()),
        scaleX: 1,
        scaleY: 1,
      } as Partial<Annotation>);
      node.scaleX(1);
      node.scaleY(1);
      return;
    }

    // For ellipse: bake scale into radii
    if (ann.type === 'ellipse') {
      const ell = ann as EllipseAnnotation;
      updateAnnotation(ann.id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        radiusX: Math.max(5, ell.radiusX * node.scaleX()),
        radiusY: Math.max(5, ell.radiusY * node.scaleY()),
        scaleX: 1,
        scaleY: 1,
      } as Partial<Annotation>);
      node.scaleX(1);
      node.scaleY(1);
      return;
    }

    // For text: bake scale into width/height
    if (ann.type === 'text') {
      updateAnnotation(ann.id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(50, (ann as { width: number }).width * node.scaleX()),
        height: Math.max(30, (ann as { height: number }).height * node.scaleY()),
        scaleX: 1,
        scaleY: 1,
      } as Partial<Annotation>);
      node.scaleX(1);
      node.scaleY(1);
      return;
    }

    // Otherwise, store scale normally
    updateAnnotation(ann.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
  }, [ann, updateAnnotation]);

  const common = {
    ref: shapeRef as React.RefObject<Konva.Node>,
    id: ann.id,
    x: ann.x,
    y: ann.y,
    rotation: ann.rotation,
    scaleX: ann.scaleX,
    scaleY: ann.scaleY,
    opacity: ann.opacity,
    draggable: !ann.locked && activeTool === 'select',
    onClick: handleClick,
    onTap: handleClick,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
  };

  const dashArr = getDashArray(ann.dash ?? 'solid', ann.strokeWidth);

  // Determine which anchors to enable based on type
  const getAnchors = () => {
    switch (ann.type) {
      case 'rect':
      case 'ellipse':
      case 'highlight':
      case 'text':
        return ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
      default:
        return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    }
  };

  let shapeElement: React.ReactNode = null;

  switch (ann.type) {
    case 'rect':
      shapeElement = (
        <Rect
          {...common}
          ref={shapeRef as React.RefObject<Konva.Rect>}
          width={ann.width}
          height={ann.height}
          stroke={ann.stroke}
          strokeWidth={ann.strokeWidth}
          fill={ann.fill === 'transparent' ? undefined : ann.fill}
          dash={dashArr}
          cornerRadius={ann.cornerRadius || 0}
        />
      );
      break;

    case 'ellipse':
      shapeElement = (
        <Ellipse
          {...common}
          ref={shapeRef as React.RefObject<Konva.Ellipse>}
          radiusX={ann.radiusX}
          radiusY={ann.radiusY}
          stroke={ann.stroke}
          strokeWidth={ann.strokeWidth}
          fill={ann.fill === 'transparent' ? undefined : ann.fill}
          dash={dashArr}
        />
      );
      break;

    case 'arrow':
      shapeElement = (
        <Arrow
          {...common}
          ref={shapeRef as React.RefObject<Konva.Arrow>}
          points={ann.points}
          stroke={ann.stroke}
          strokeWidth={ann.strokeWidth}
          fill={ann.stroke}
          pointerLength={10}
          pointerWidth={10}
          dash={dashArr}
        />
      );
      break;

    case 'line':
      shapeElement = (
        <Line
          {...common}
          ref={shapeRef as React.RefObject<Konva.Line>}
          points={ann.points}
          stroke={ann.stroke}
          strokeWidth={ann.strokeWidth}
          dash={dashArr}
        />
      );
      break;

    case 'pen':
      shapeElement = (
        <Line
          {...common}
          ref={shapeRef as React.RefObject<Konva.Line>}
          points={ann.points}
          stroke={ann.stroke}
          strokeWidth={ann.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          dash={dashArr}
        />
      );
      break;

    case 'highlight':
      shapeElement = (
        <Rect
          {...common}
          ref={shapeRef as React.RefObject<Konva.Rect>}
          width={ann.width}
          height={ann.height}
          fill={ann.stroke}
          opacity={ann.opacity}
        />
      );
      break;

    case 'text':
      shapeElement = (
        <Group
          {...common}
          ref={shapeRef as React.RefObject<Konva.Group>}
        >
          <Rect
            width={ann.width || 200}
            height={ann.height || 120}
            fill="#fef08a"
            stroke="#eab308"
            strokeWidth={1}
            shadowColor="black"
            shadowBlur={6}
            shadowOpacity={0.15}
            shadowOffsetX={2}
            shadowOffsetY={2}
            cornerRadius={4}
          />
          <Text
            text={ann.text || 'Double-click to edit…'}
            fontSize={ann.fontSize || 14}
            fontFamily="Inter, sans-serif"
            fill="#1e293b"
            width={(ann.width || 200) - 16}
            padding={8}
            wrap="word"
          />
        </Group>
      );
      break;

    case 'measure': {
      const m = ann as MeasureAnnotation;
      const ddx = m.points[2] - m.points[0];
      const ddy = m.points[3] - m.points[1];
      const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      const nx = -ddy / len * 6;
      const ny = ddx / len * 6;
      const midX = (m.points[0] + m.points[2]) / 2;
      const midY = (m.points[1] + m.points[3]) / 2;
      const angle = Math.atan2(ddy, ddx) * (180 / Math.PI);
      const labelRotation = (angle > 90 || angle < -90) ? angle + 180 : angle;
      shapeElement = (
        <Group
          {...common}
          ref={shapeRef as React.RefObject<Konva.Group>}
        >
          <Line points={m.points} stroke="#22d3ee" strokeWidth={2} dash={[8, 4]} />
          <Line
            points={[m.points[0] + nx, m.points[1] + ny, m.points[0] - nx, m.points[1] - ny]}
            stroke="#22d3ee" strokeWidth={2}
          />
          <Line
            points={[m.points[2] + nx, m.points[3] + ny, m.points[2] - nx, m.points[3] - ny]}
            stroke="#22d3ee" strokeWidth={2}
          />
          <Text
            x={midX} y={midY - 10}
            text={m.realLength}
            fontSize={13}
            fontFamily="Inter, sans-serif"
            fill="#22d3ee"
            rotation={labelRotation}
            align="center"
          />
        </Group>
      );
      break;
    }

    default:
      return null;
  }

  return (
    <>
      {shapeElement}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          borderStroke="#3b82f6"
          borderStrokeWidth={1.5}
          anchorFill="#ffffff"
          anchorStroke="#3b82f6"
          anchorSize={8}
          anchorCornerRadius={2}
          enabledAnchors={getAnchors()}
          keepRatio={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

export function AnnotationRenderer() {
  const annotations = useStore((s) => s.annotations);

  return (
    <>
      {annotations.map((ann) => (
        <AnnotationShape key={ann.id} ann={ann} />
      ))}
    </>
  );
}
