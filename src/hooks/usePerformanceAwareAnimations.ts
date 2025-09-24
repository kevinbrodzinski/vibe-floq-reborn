import { useMemo } from 'react';
import { usePerformanceOptimization } from './usePerformanceOptimization';

interface AnimationConfig {
  duration: number;
  easing: string;
  reduceMotion: boolean;
  skipComplexAnimations: boolean;
}

export function usePerformanceAwareAnimations() {
  const { 
    shouldReduceMotion, 
    getCurrentFPS,
    isPerformanceCritical
  } = usePerformanceOptimization();

  // Calculate optimal animation settings based on performance
  const animationConfig = useMemo((): AnimationConfig => {
    const fps = getCurrentFPS();
    const isLowPerformance = isPerformanceCritical();

    // Performance scoring (0-1, higher is better)
    const performanceScore = Math.min(1, fps / 60);

    // Adjust animations based on performance
    let duration = 300; // Base duration in ms
    let easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
    let skipComplexAnimations = false;

    if (shouldReduceMotion) {
      duration = 0;
      easing = 'linear';
      skipComplexAnimations = true;
    } else if (isLowPerformance || performanceScore < 0.3) {
      // Poor performance - minimal animations
      duration = 150;
      easing = 'linear';
      skipComplexAnimations = true;
    } else if (performanceScore < 0.6) {
      // Medium performance - simplified animations
      duration = 200;
      easing = 'ease';
      skipComplexAnimations = true;
    } else {
      // Good performance - full animations
      duration = 300;
      easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
      skipComplexAnimations = false;
    }

    return {
      duration,
      easing,
      reduceMotion: shouldReduceMotion,
      skipComplexAnimations
    };
  }, [shouldReduceMotion, getCurrentFPS, isPerformanceCritical]);

  // Animation preset generators
  const getTransitionConfig = (type: 'fast' | 'normal' | 'slow' = 'normal') => {
    const multipliers = { fast: 0.5, normal: 1, slow: 1.5 };
    const multiplier = multipliers[type];

    return {
      duration: `${animationConfig.duration * multiplier}ms`,
      timingFunction: animationConfig.easing,
      willChange: animationConfig.skipComplexAnimations ? 'auto' : 'transform, opacity'
    };
  };

  const getSpringConfig = () => ({
    tension: animationConfig.skipComplexAnimations ? 300 : 200,
    friction: animationConfig.skipComplexAnimations ? 30 : 25,
    mass: 1
  });

  // CSS animation classes
  const getAnimationClasses = () => ({
    fadeIn: animationConfig.reduceMotion ? '' : 'animate-fade-in',
    slideIn: animationConfig.reduceMotion ? '' : 'animate-slide-in-right',
    scaleIn: animationConfig.reduceMotion ? '' : 'animate-scale-in',
    
    // Performance-aware classes
    fastFade: animationConfig.skipComplexAnimations ? '' : 'transition-opacity',
    smoothTransform: animationConfig.skipComplexAnimations 
      ? 'transition-all duration-150 ease-linear' 
      : 'transition-all duration-300 ease-out',
    
    // Interactive states
    hoverScale: animationConfig.skipComplexAnimations 
      ? '' 
      : 'hover:scale-105 transition-transform duration-200',
    
    pressScale: animationConfig.skipComplexAnimations 
      ? '' 
      : 'active:scale-95 transition-transform duration-100'
  });

  // Gesture animation helpers
  const getGestureConfig = () => ({
    drag: {
      dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
      dragElastic: animationConfig.skipComplexAnimations ? 0 : 0.1,
      dragTransition: { 
        bounceStiffness: animationConfig.skipComplexAnimations ? 600 : 300,
        bounceDamping: animationConfig.skipComplexAnimations ? 40 : 20
      }
    },
    
    tap: {
      scale: animationConfig.skipComplexAnimations ? 1 : 0.95,
      transition: { duration: animationConfig.duration / 1000 }
    },
    
    hover: {
      scale: animationConfig.skipComplexAnimations ? 1 : 1.05,
      transition: { duration: animationConfig.duration / 1000 }
    }
  });

  // Performance-aware animation variants for framer-motion
  const getMotionVariants = () => ({
    initial: { 
      opacity: 0, 
      y: animationConfig.skipComplexAnimations ? 0 : 20,
      scale: animationConfig.skipComplexAnimations ? 1 : 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: animationConfig.duration / 1000,
        ease: animationConfig.easing.replace('cubic-bezier', 'cubicBezier')
      }
    },
    exit: { 
      opacity: 0, 
      y: animationConfig.skipComplexAnimations ? 0 : -20,
      scale: animationConfig.skipComplexAnimations ? 1 : 0.95,
      transition: {
        duration: (animationConfig.duration * 0.8) / 1000
      }
    }
  });

  // Animation decision helpers
  const shouldAnimate = (complexity: 'low' | 'medium' | 'high' = 'medium') => {
    if (animationConfig.reduceMotion) return false;
    if (complexity === 'high' && animationConfig.skipComplexAnimations) return false;
    return true;
  };

  const getOptimalFrameRate = () => {
    const currentFPS = getCurrentFPS();
    if (currentFPS < 30) return 15; // Very low performance
    if (currentFPS < 45) return 30; // Low performance
    return 60; // Normal performance
  };

  return {
    animationConfig,
    getTransitionConfig,
    getSpringConfig,
    getAnimationClasses,
    getGestureConfig,
    getMotionVariants,
    shouldAnimate,
    getOptimalFrameRate,
    
    // Direct config access
    duration: animationConfig.duration,
    easing: animationConfig.easing,
    reduceMotion: animationConfig.reduceMotion,
    skipComplexAnimations: animationConfig.skipComplexAnimations
  };
}