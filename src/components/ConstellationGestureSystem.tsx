
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { zIndex } from '@/constants/z';

interface GesturePoint {
  x: number;
  y: number;
  id: string;
  timestamp: number;
  velocity?: { x: number; y: number };
}

interface ConstellationGestureSystemProps {
  onGestureStart?: (point: GesturePoint) => void;
  onGestureMove?: (point: GesturePoint) => void;
  onGestureEnd?: (point: GesturePoint) => void;
  onMultiTouch?: (points: GesturePoint[]) => void;
  onConstellationAction?: (action: any) => void;
  onOrbitalAdjustment?: (direction: 'expand' | 'contract', intensity: number) => void;
  onEnergyShare?: (fromId: string, toId: string, energy: number) => void;
  isActive?: boolean;
  enableTrails?: boolean;
  trailLength?: number;
  gestureThreshold?: number;
  className?: string;
  children?: React.ReactNode;
}

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
  timestamp: number;
}

export const ConstellationGestureSystem: React.FC<ConstellationGestureSystemProps> = ({
  onGestureStart = () => {},
  onGestureMove = () => {},
  onGestureEnd = () => {},
  onMultiTouch = () => {},
  onConstellationAction = () => {},
  onOrbitalAdjustment = () => {},
  onEnergyShare = () => {},
  isActive = false,
  enableTrails = true,
  trailLength = 20,
  gestureThreshold = 10,
  className = "",
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePoints, setActivePoints] = useState<GesturePoint[]>([]);
  const [trails, setTrails] = useState<TrailPoint[]>([]);
  const prefersReduced = usePrefersReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useTransform([x, y], ([latestX, latestY]) => {
    const distance = Math.sqrt((latestX as number) * (latestX as number) + (latestY as number) * (latestY as number));
    return Math.max(0.8, 1 - distance / 1000);
  });

  const createGesturePoint = useCallback((clientX: number, clientY: number, id: string): GesturePoint => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, id, timestamp: Date.now() };

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      id,
      timestamp: Date.now()
    };
  }, []);

  const addTrailPoint = useCallback((point: GesturePoint) => {
    if (!enableTrails || prefersReduced) return;

    setTrails(prev => {
      const newTrail: TrailPoint = {
        x: point.x,
        y: point.y,
        opacity: 1,
        timestamp: Date.now()
      };
      
      const filtered = prev
        .filter(trail => Date.now() - trail.timestamp < 1000)
        .slice(-trailLength);
      
      return [...filtered, newTrail];
    });
  }, [enableTrails, prefersReduced, trailLength]);

  // Clean up old trail points
  useEffect(() => {
    if (!enableTrails) return;

    const interval = setInterval(() => {
      setTrails(prev => prev.filter(trail => Date.now() - trail.timestamp < 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [enableTrails]);

  const handlePanStart = (event: any, info: PanInfo) => {
    const point = createGesturePoint(info.point.x, info.point.y, 'primary');
    setActivePoints([point]);
    onGestureStart(point);
    addTrailPoint(point);
  };

  const handlePan = (event: any, info: PanInfo) => {
    const point = createGesturePoint(info.point.x, info.point.y, 'primary');
    point.velocity = info.velocity;
    
    setActivePoints([point]);
    onGestureMove(point);
    addTrailPoint(point);
    
    x.set(info.offset.x);
    y.set(info.offset.y);
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    const point = createGesturePoint(info.point.x, info.point.y, 'primary');
    point.velocity = info.velocity;
    
    onGestureEnd(point);
    setActivePoints([]);
    
    x.set(0);
    y.set(0);
  };

  // Touch event handlers for multi-touch support
  const handleTouchStart = (event: React.TouchEvent) => {
    const touches = Array.from(event.touches);
    const points = touches.map((touch, index) => 
      createGesturePoint(touch.clientX, touch.clientY, `touch-${index}`)
    );

    setActivePoints(points);
    
    if (points.length > 1) {
      onMultiTouch(points);
    } else if (points.length === 1) {
      onGestureStart(points[0]);
      addTrailPoint(points[0]);
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    const touches = Array.from(event.touches);
    const points = touches.map((touch, index) => 
      createGesturePoint(touch.clientX, touch.clientY, `touch-${index}`)
    );

    setActivePoints(points);
    
    if (points.length > 1) {
      onMultiTouch(points);
    } else if (points.length === 1) {
      onGestureMove(points[0]);
      addTrailPoint(points[0]);
    }
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const remainingTouches = Array.from(event.touches);
    const points = remainingTouches.map((touch, index) => 
      createGesturePoint(touch.clientX, touch.clientY, `touch-${index}`)
    );

    setActivePoints(points);

    if (points.length === 0 && activePoints.length > 0) {
      onGestureEnd(activePoints[0]);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      {...zIndex('modal')}
    >
      {/* Main interactive layer */}
      <motion.div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        drag
        dragConstraints={containerRef}
        dragElastic={0.1}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ scale }}
      >
        {children}
      </motion.div>

      {/* Trail visualization */}
      {enableTrails && !prefersReduced && (
        <div className="absolute inset-0 pointer-events-none">
          {trails.map((trail, index) => {
            const age = Date.now() - trail.timestamp;
            const opacity = Math.max(0, trail.opacity * (1 - age / 1000));
            
            return (
              <motion.div
                key={`${trail.timestamp}-${index}`}
                className="absolute w-2 h-2 rounded-full bg-primary/50"
                style={{
                  left: trail.x - 4,
                  top: trail.y - 4,
                  opacity
                }}
                initial={{ scale: 1 }}
                animate={{ scale: 0.5 }}
                transition={{ duration: 1 }}
              />
            );
          })}
        </div>
      )}

      {/* Active gesture points */}
      {activePoints.map((point, index) => (
        <motion.div
          key={point.id}
          className="absolute w-6 h-6 rounded-full bg-primary border-2 border-background shadow-lg pointer-events-none"
          style={{
            left: point.x - 12,
            top: point.y - 12
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      ))}

      {/* Constellation lines for multi-touch */}
      {activePoints.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none">
          {activePoints.map((point, index) => 
            activePoints.slice(index + 1).map((otherPoint, otherIndex) => (
              <motion.line
                key={`line-${index}-${otherIndex}`}
                x1={point.x}
                y1={point.y}
                x2={otherPoint.x}
                y2={otherPoint.y}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeOpacity="0.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3 }}
              />
            ))
          )}
        </svg>
      )}
    </div>
  );
};
