import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Viewport } from '../../types';
import type { ContentBounds, ViewportStageSize } from '../../lib/workspaceViewport';
import { clamp } from '../../lib/utils';

interface CanvasScrollbarsProps {
  bounds: ContentBounds | null;
  stageSize: ViewportStageSize;
  viewport: Viewport;
  setViewport: (viewport: Partial<Viewport>) => void;
}

type ScrollAxis = 'horizontal' | 'vertical';

interface AxisMetrics {
  hasOverflow: boolean;
  scrollMin: number;
  visibleSize: number;
  overflow: number;
  currentStart: number;
  totalSize: number;
}

interface ThumbMetrics {
  size: number;
  offset: number;
  maxTravel: number;
}

const CONTENT_PADDING = 120;
const MIN_THUMB_SIZE = 40;
const TRACK_INSET = 8;
const TRACK_OVERLAP_INSET = 24;

function getAxisMetrics(
  axis: ScrollAxis,
  bounds: ContentBounds,
  stageSize: ViewportStageSize,
  viewport: Viewport,
): AxisMetrics {
  const min = axis === 'horizontal' ? bounds.minX : bounds.minY;
  const max = axis === 'horizontal' ? bounds.maxX : bounds.maxY;
  const containerSize = axis === 'horizontal' ? stageSize.width : stageSize.height;
  const offset = axis === 'horizontal' ? viewport.x : viewport.y;
  const scrollMin = min - CONTENT_PADDING;
  const totalSize = Math.max(1, max - min + CONTENT_PADDING * 2);
  const visibleSize = containerSize / viewport.zoom;
  const overflow = Math.max(0, totalSize - visibleSize);
  const currentStart = clamp(-offset / viewport.zoom, scrollMin, scrollMin + overflow);

  return {
    hasOverflow: overflow > 1 && containerSize > 0,
    scrollMin,
    visibleSize,
    overflow,
    currentStart,
    totalSize,
  };
}

function getThumbMetrics(trackSize: number, axisMetrics: AxisMetrics): ThumbMetrics {
  const size = clamp(
    (axisMetrics.visibleSize / axisMetrics.totalSize) * trackSize,
    MIN_THUMB_SIZE,
    trackSize,
  );
  const maxTravel = Math.max(0, trackSize - size);
  const offset =
    axisMetrics.overflow <= 0
      ? 0
      : ((axisMetrics.currentStart - axisMetrics.scrollMin) / axisMetrics.overflow) * maxTravel;

  return { size, offset, maxTravel };
}

export function CanvasScrollbars({
  bounds,
  stageSize,
  viewport,
  setViewport,
}: CanvasScrollbarsProps) {
  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const verticalTrackRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    axis: ScrollAxis;
    pointerOffset: number;
  } | null>(null);

  const horizontalAxis = useMemo(
    () => (bounds ? getAxisMetrics('horizontal', bounds, stageSize, viewport) : null),
    [bounds, stageSize, viewport],
  );
  const verticalAxis = useMemo(
    () => (bounds ? getAxisMetrics('vertical', bounds, stageSize, viewport) : null),
    [bounds, stageSize, viewport],
  );

  const showHorizontal = Boolean(horizontalAxis?.hasOverflow);
  const showVertical = Boolean(verticalAxis?.hasOverflow);
  const horizontalTrackSize = Math.max(
    0,
    stageSize.width - TRACK_INSET - (showVertical ? TRACK_OVERLAP_INSET : TRACK_INSET),
  );
  const verticalTrackSize = Math.max(
    0,
    stageSize.height - TRACK_INSET - (showHorizontal ? TRACK_OVERLAP_INSET : TRACK_INSET),
  );

  const horizontalThumb = useMemo(() => {
    if (!horizontalAxis || !showHorizontal || horizontalTrackSize <= 0) {
      return null;
    }
    return getThumbMetrics(horizontalTrackSize, horizontalAxis);
  }, [horizontalAxis, horizontalTrackSize, showHorizontal]);

  const verticalThumb = useMemo(() => {
    if (!verticalAxis || !showVertical || verticalTrackSize <= 0) {
      return null;
    }
    return getThumbMetrics(verticalTrackSize, verticalAxis);
  }, [showVertical, verticalAxis, verticalTrackSize]);

  const setScrollPosition = useCallback(
    (axis: ScrollAxis, worldStart: number) => {
      if (axis === 'horizontal') {
        setViewport({ x: -worldStart * viewport.zoom });
        return;
      }
      setViewport({ y: -worldStart * viewport.zoom });
    },
    [setViewport, viewport.zoom],
  );

  const moveThumbFromClient = useCallback(
    (axis: ScrollAxis, clientPosition: number, pointerOffset: number) => {
      const axisMetrics = axis === 'horizontal' ? horizontalAxis : verticalAxis;
      const thumbMetrics = axis === 'horizontal' ? horizontalThumb : verticalThumb;
      const track = axis === 'horizontal' ? horizontalTrackRef.current : verticalTrackRef.current;

      if (!axisMetrics || !thumbMetrics || !track) {
        return;
      }

      const rect = track.getBoundingClientRect();
      const rawPosition =
        clientPosition - (axis === 'horizontal' ? rect.left : rect.top) - pointerOffset;
      const clampedPosition = clamp(rawPosition, 0, thumbMetrics.maxTravel);
      const ratio =
        thumbMetrics.maxTravel <= 0 ? 0 : clampedPosition / thumbMetrics.maxTravel;
      const nextStart = axisMetrics.scrollMin + ratio * axisMetrics.overflow;

      setScrollPosition(axis, nextStart);
    },
    [horizontalAxis, horizontalThumb, setScrollPosition, verticalAxis, verticalThumb],
  );

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      moveThumbFromClient(
        dragState.axis,
        dragState.axis === 'horizontal' ? event.clientX : event.clientY,
        dragState.pointerOffset,
      );
    };

    const handleMouseUp = () => setDragState(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, moveThumbFromClient]);

  const handleThumbMouseDown = useCallback(
    (axis: ScrollAxis) => (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const rect = event.currentTarget.getBoundingClientRect();
      const pointerOffset =
        axis === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top;

      setDragState({ axis, pointerOffset });
    },
    [],
  );

  const handleTrackMouseDown = useCallback(
    (axis: ScrollAxis) => (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const thumbMetrics = axis === 'horizontal' ? horizontalThumb : verticalThumb;
      if (!thumbMetrics) {
        return;
      }

      moveThumbFromClient(
        axis,
        axis === 'horizontal' ? event.clientX : event.clientY,
        thumbMetrics.size / 2,
      );
    },
    [horizontalThumb, moveThumbFromClient, verticalThumb],
  );

  if (!bounds || (!showHorizontal && !showVertical)) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {showHorizontal && horizontalThumb && (
        <div
          ref={horizontalTrackRef}
          className="pointer-events-auto absolute bottom-2 left-2 h-3 rounded-full border border-slate-700/60 bg-slate-900/70"
          style={{ right: showVertical ? `${TRACK_OVERLAP_INSET}px` : `${TRACK_INSET}px` }}
          onMouseDown={handleTrackMouseDown('horizontal')}
          aria-label="Horizontal canvas scrollbar"
        >
          <div
            className="absolute top-0.5 bottom-0.5 rounded-full bg-slate-400/80 hover:bg-slate-300 transition-colors"
            style={{
              left: horizontalThumb.offset,
              width: horizontalThumb.size,
            }}
            onMouseDown={handleThumbMouseDown('horizontal')}
          />
        </div>
      )}

      {showVertical && verticalThumb && (
        <div
          ref={verticalTrackRef}
          className="pointer-events-auto absolute right-2 top-2 w-3 rounded-full border border-slate-700/60 bg-slate-900/70"
          style={{ bottom: showHorizontal ? `${TRACK_OVERLAP_INSET}px` : `${TRACK_INSET}px` }}
          onMouseDown={handleTrackMouseDown('vertical')}
          aria-label="Vertical canvas scrollbar"
        >
          <div
            className="absolute left-0.5 right-0.5 rounded-full bg-slate-400/80 hover:bg-slate-300 transition-colors"
            style={{
              top: verticalThumb.offset,
              height: verticalThumb.size,
            }}
            onMouseDown={handleThumbMouseDown('vertical')}
          />
        </div>
      )}
    </div>
  );
}
