import { useCallback, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { useAdvancedHaptics } from './useAdvancedHaptics';
import { useJoinIntent } from './useJoinIntent';

interface FloqGestureOptions {
  floqId: string;
  onSave?: () => void;
  onJoin?: () => void;
  onPeek?: () => void;
  onContextMenu?: () => void;
  commitmentIntensity?: number;
}

export function useAdvancedFloqGestures(options: FloqGestureOptions) {
  const { light, medium, heavy, success, warning } = useAdvancedHaptics();
  const { stage, setStage } = useJoinIntent(options.floqId);
  const [pressureIntensity, setPressureIntensity] = useState(0);
  const [gestureActive, setGestureActive] = useState(false);
  
  const longPressTimer = useRef<NodeJS.Timeout>();
  const commitmentThreshold = 0.7; // Pressure needed for commitment

  const bind = useGesture({
    onDrag: ({ direction: [dx, dy], distance, velocity, cancel, event }) => {
      const [vx] = velocity;
      
      // Prevent conflicts with scroll on mobile
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) {
        return; // Let native scroll handle vertical gestures
      }
      
      // Swipe actions with haptic feedback - more tolerant on mobile
      const threshold = window.innerWidth < 768 ? 60 : 80; // Lower threshold on mobile
      const velocityThreshold = window.innerWidth < 768 ? 0.3 : 0.4;
      
      if (distance[0] > threshold && Math.abs(vx) > velocityThreshold) {
        // Prevent default scroll behavior
        event?.preventDefault?.();
        
        if (dx > 0) {
          // Swipe right -> Save/Bookmark
          success();
          options.onSave?.();
          cancel();
        } else if (dx < 0) {
          // Swipe left -> Join Intent
          medium();
          options.onJoin?.();
          cancel();
        }
      }
    },

    onPinch: ({ offset: [scale], memo }) => {
      if (!memo) memo = stage;
      
      // Pinch to change commitment level
      if (scale > 1.2 && stage !== "commit") {
        heavy();
        setStage("commit");
        setPressureIntensity(1);
      } else if (scale < 0.8 && stage !== "watch") {
        light();
        setStage("watch");
        setPressureIntensity(0);
      }
      
      return memo;
    },

    onMove: ({ pressed, timeStamp, initial, xy }) => {
      if (!pressed) return;
      
      const duration = timeStamp - initial[0];
      const pressure = 0.5; // Simplified pressure simulation
      
      // Pressure-sensitive commitment
      setPressureIntensity(pressure);
      
      if (pressure > commitmentThreshold && stage !== "commit") {
        heavy();
        setStage("commit");
      } else if (pressure < 0.3 && stage === "commit") {
        light();
        setStage("consider");
      }

      // Long press for context menu
      if (duration > 800 && !longPressTimer.current) {
        longPressTimer.current = setTimeout(() => {
          warning();
          options.onContextMenu?.();
        }, 50);
      }
    },

    onPointerDown: () => {
      setGestureActive(true);
      light();
    },

    onPointerUp: () => {
      setGestureActive(false);
      setPressureIntensity(0);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = undefined;
      }
    },

    onClick: () => {
      // Single tap opens peek
      light();
      options.onPeek?.();
    },

    onDoubleClick: () => {
      // Double tap for quick join
      success();
      if (stage === "watch") {
        setStage("commit");
      } else {
        options.onJoin?.();
      }
    }
  }, {
    drag: {
      threshold: 10,
      filterTaps: true,
      axis: 'x' // Horizontal swipes only
    },
    pinch: {
      threshold: 0.1
    }
  });

  return {
    bind,
    gestureActive,
    pressureIntensity,
    currentStage: stage,
    // Visual feedback helpers
    getScaleTransform: () => gestureActive ? 0.98 : 1,
    getPressureGlow: () => pressureIntensity > 0.5 ? pressureIntensity : 0,
    getCommitmentColor: () => {
      if (pressureIntensity > commitmentThreshold) return 'var(--success)';
      if (pressureIntensity > 0.3) return 'var(--warning)';
      return 'var(--muted)';
    }
  };
}