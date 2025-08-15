import React, { useState, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Edit3, Trash2, MoreHorizontal } from 'lucide-react';
import { StopCard } from '@/components/StopCard';
import { cn } from '@/lib/utils';
import type { PlanStop } from '@/types/plan';

interface SwipeableStopCardProps {
  stop: PlanStop;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  onLongPress?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function SwipeableStopCard({
  stop,
  onEdit,
  onDelete,
  onSelect,
  onLongPress,
  className,
  children
}: SwipeableStopCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-150, -75, 0, 75, 150],
    ['#ef4444', '#f97316', '#transparent', '#22c55e', '#3b82f6']
  );

  const handlePanStart = () => {
    // Clear any existing long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handlePan = (event: any, info: PanInfo) => {
    // Update the x position
    x.set(info.offset.x);
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    const threshold = 75;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Determine action based on swipe direction and distance
    if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
      if (offset < -threshold) {
        // Swipe left - Delete action
        setIsRevealed(true);
        x.set(-150);
        if (onDelete) {
          setTimeout(() => {
            onDelete();
            x.set(0);
            setIsRevealed(false);
          }, 200);
        }
      } else if (offset > threshold) {
        // Swipe right - Edit action
        setIsRevealed(true);
        x.set(150);
        if (onEdit) {
          setTimeout(() => {
            onEdit();
            x.set(0);
            setIsRevealed(false);
          }, 200);
        }
      }
    } else {
      // Snap back to center
      x.set(0);
      setIsRevealed(false);
    }
  };

  const handleTouchStart = () => {
    // Start long press timer
    const timer = setTimeout(() => {
      if (onLongPress) {
        onLongPress();
        // Add haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleClick = () => {
    if (!isRevealed && onSelect) {
      onSelect();
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {/* Background Actions */}
      <motion.div
        className="absolute inset-0 flex items-center justify-between px-6"
        style={{ backgroundColor: background }}
      >
        {/* Right swipe action (Edit) */}
        <div className="flex items-center gap-2 text-white">
          <Edit3 className="w-5 h-5" />
          <span className="font-medium">Edit</span>
        </div>

        {/* Left swipe action (Delete) */}
        <div className="flex items-center gap-2 text-white">
          <span className="font-medium">Delete</span>
          <Trash2 className="w-5 h-5" />
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.2}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className="relative z-10 bg-card cursor-grab active:cursor-grabbing"
        whileTap={{ scale: 0.98 }}
      >
        {children || (
          <StopCard
            stop={stop}
            onSelect={onSelect}
            onEdit={onEdit}
            onRemove={onDelete}
            draggable={false} // Disable default dragging since we're handling swipe
            className="border-0 shadow-lg"
          />
        )}

        {/* Long press indicator */}
        {longPressTimer && (
          <div className="absolute top-2 right-2 z-20">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground animate-pulse" />
          </div>
        )}
      </motion.div>
    </div>
  );
}