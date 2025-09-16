import { useState, useCallback, useEffect } from 'react';
import { useAdvancedHaptics } from './useAdvancedHaptics';

type PeekStage = "watch" | "consider" | "commit";

interface PeekTransitionConfig {
  stage: PeekStage;
  duration?: number;
  easing?: string;
  hapticPattern?: 'light' | 'medium' | 'heavy';
}

export function useEnhancedPeekSystem(initialStage: PeekStage = "watch") {
  const [currentStage, setCurrentStage] = useState<PeekStage>(initialStage);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { light, medium, heavy } = useAdvancedHaptics();

  // Smooth stage progression animations (simplified without react-spring)
  const [animationProps, setAnimationProps] = useState({
    scale: 1,
    opacity: 1,
    rotateY: 0,
    x: 0
  });

  // Gesture-based stage progression
  const progressToStage = useCallback((newStage: PeekStage, config?: PeekTransitionConfig) => {
    if (newStage === currentStage || isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Haptic feedback based on transition
    const hapticMap = {
      watch: light,
      consider: medium,
      commit: heavy
    };
    hapticMap[newStage]();

    // Simple animation with timeout
    setAnimationProps({ scale: 0.95, opacity: 0.8, rotateY: -5, x: 0 });
    
    setTimeout(() => {
      setCurrentStage(newStage);
      setAnimationProps({ scale: 1, opacity: 1, rotateY: 0, x: 0 });
      setIsTransitioning(false);
    }, 200);
  }, [currentStage, isTransitioning, light, medium, heavy]);

  // Swipe gesture handling
  const handleSwipeProgression = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    const stages: PeekStage[] = ["watch", "consider", "commit"];
    const currentIndex = stages.indexOf(currentStage);

    switch (direction) {
      case 'right': // Progress forward
        if (currentIndex < stages.length - 1) {
          progressToStage(stages[currentIndex + 1]);
        }
        break;
      case 'left': // Progress backward
        if (currentIndex > 0) {
          progressToStage(stages[currentIndex - 1]);
        }
        break;
      case 'up': // Quick commit
        progressToStage("commit");
        break;
      case 'down': // Quick watch
        progressToStage("watch");
        break;
    }
  }, [currentStage, progressToStage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          handleSwipeProgression('right');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSwipeProgression('left');
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleSwipeProgression('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleSwipeProgression('down');
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          progressToStage("commit");
          break;
        case 'Escape':
          e.preventDefault();
          progressToStage("watch");
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSwipeProgression, progressToStage]);

  // Progress indicators
  const getProgressPercentage = () => {
    const stageMap = { watch: 0, consider: 50, commit: 100 };
    return stageMap[currentStage];
  };

  const getNextStage = (): PeekStage | null => {
    if (currentStage === "watch") return "consider";
    if (currentStage === "consider") return "commit";
    return null;
  };

  const getPrevStage = (): PeekStage | null => {
    if (currentStage === "commit") return "consider";
    if (currentStage === "consider") return "watch";
    return null;
  };

  return {
    currentStage,
    isTransitioning,
    animationProps,
    progressToStage,
    handleSwipeProgression,
    getProgressPercentage,
    getNextStage,
    getPrevStage,
    // Gesture helpers
    canProgressForward: getNextStage() !== null,
    canProgressBackward: getPrevStage() !== null,
    isCommitted: currentStage === "commit"
  };
}