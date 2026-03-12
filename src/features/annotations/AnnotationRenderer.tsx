import { Rect, Ellipse, Arrow, Line, Group, Text } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '../../store/useStore';
import type { Annotation, MeasureAnnotation } from '../../types';

export function AnnotationRenderer() {
  const annotations = useStore((s) => s.annotations);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const activeTool = useStore((s) => s.activeTool);
  const selectedAnnotationIds = useStore((s) => s.selectedAnnotationIds);
  const setSelectedAnnotationIds = useStore((s) => s.setSelectedAnnotationIds);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);

  const handleClick = (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'select') return;
    e.cancelBubble = true;

    const multi = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    if (multi) {
      const isSelected = selectedAnnotationIds.includes(id);
      if (isSelected) {
        setSelectedAnnotationIds(selectedAnnotationIds.filter((a) => a !== id));
      } else {
        setSelectedAnnotationIds([...selectedAnnotationIds, id]);
      }
    } else {
      setSelectedAnnotationIds([id]);
      setSelectedNodeIds([]);
    }
  };

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    updateAnnotation(id, { x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = (annotation: Annotation, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    updateAnnotation(annotation.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
  };

  return (
    <>
      {annotations.map((ann) => {
        const common = {
          id: ann.id,
          x: ann.x,
          y: ann.y,
          rotation: ann.rotation,
          scaleX: ann.scaleX,
          scaleY: ann.scaleY,
          opacity: ann.opacity,
          draggable: !ann.locked && activeTool === 'select',
          onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleClick(ann.id, e),
          onTap: (e: Konva.KonvaEventObject<MouseEvent>) => handleClick(ann.id, e),
          onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(ann.id, e),
          onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(ann, e),
        };

        switch (ann.type) {
          case 'rect':
            return (
              <Rect
                key={ann.id}
                {...common}
                width={ann.width}
                height={ann.height}
                stroke={ann.stroke}
                strokeWidth={ann.strokeWidth}
                fill={ann.fill === 'transparent' ? undefined : ann.fill}
              />
            );

          case 'ellipse':
            return (
              <Ellipse
                key={ann.id}
                {...common}
                radiusX={ann.radiusX}
                radiusY={ann.radiusY}
                stroke={ann.stroke}
                strokeWidth={ann.strokeWidth}
                fill={ann.fill === 'transparent' ? undefined : ann.fill}
              />
            );

          case 'arrow':
            return (
              <Arrow
                key={ann.id}
                {...common}
                points={ann.points}
                stroke={ann.stroke}
                strokeWidth={ann.strokeWidth}
                fill={ann.stroke}
                pointerLength={10}
                pointerWidth={10}
              />
            );

          case 'line':
            return (
              <Line
                key={ann.id}
                {...common}
                points={ann.points}
                stroke={ann.stroke}
                strokeWidth={ann.strokeWidth}
              />
            );

          case 'pen':
            return (
              <Line
                key={ann.id}
                {...common}
                points={ann.points}
                stroke={ann.stroke}
                strokeWidth={ann.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            );

          case 'highlight':
            return (
              <Rect
                key={ann.id}
                {...common}
                width={ann.width}
                height={ann.height}
                fill={ann.stroke}
                opacity={0.3}
              />
            );

          case 'text':
            return (
              <Group key={ann.id} {...common}>
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

          case 'measure': {
            const m = ann as MeasureAnnotation;
            const dx = m.points[2] - m.points[0];
            const dy = m.points[3] - m.points[1];
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len * 6;
            const ny = dx / len * 6;
            const midX = (m.points[0] + m.points[2]) / 2;
            const midY = (m.points[1] + m.points[3]) / 2;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            // Flip label if line goes right-to-left so text reads left-to-right
            const labelRotation = (angle > 90 || angle < -90) ? angle + 180 : angle;
            return (
              <Group key={ann.id} {...common}>
                {/* Main dashed line */}
                <Line
                  points={m.points}
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dash={[8, 4]}
                />
                {/* Start cap */}
                <Line
                  points={[m.points[0] + nx, m.points[1] + ny, m.points[0] - nx, m.points[1] - ny]}
                  stroke="#22d3ee"
                  strokeWidth={2}
                />
                {/* End cap */}
                <Line
                  points={[m.points[2] + nx, m.points[3] + ny, m.points[2] - nx, m.points[3] - ny]}
                  stroke="#22d3ee"
                  strokeWidth={2}
                />
                {/* Distance label */}
                <Text
                  x={midX}
                  y={midY - 10}
                  text={m.realLength}
                  fontSize={13}
                  fontFamily="Inter, sans-serif"
                  fill="#22d3ee"
                  rotation={labelRotation}
                  offsetX={0}
                  align="center"
                />
              </Group>
            );
          }

          default:
            return null;
        }
      })}
    </>
  );
}
