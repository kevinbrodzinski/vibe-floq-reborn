import React, { useEffect, useRef, useState, forwardRef } from 'react';
import { Platform } from 'react-native';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useCanvasAnimation } from '@/hooks/useCanvasAnimation';
import { VIBE_COLORS } from '@/constants/vibes';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';

// Conditional imports for framer-motion (web only)
import { motion, AnimatePresence as FramerAnimatePresence } from 'framer-motion';

const MotionDiv = Platform.OS === 'web'
  ? motion.div
  : forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...rest }, ref) => (
        <div ref={ref as React.RefObject<HTMLDivElement>} {...rest}>
          {children}
        </div>
      ),
    );

const MotionSpan = Platform.OS === 'web'
  ? motion.span
  : forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
      ({ children, ...rest }, ref) => (
        <span ref={ref as React.RefObject<HTMLSpanElement>} {...rest}>
          {children}
        </span>
      ),
    );

const AnimatePresence = Platform.OS === 'web'
  ? FramerAnimatePresence
  : ({ children }: any) => <>{children}</>;

interface SplashScreenProps {
  onComplete: () => void;
  autoTransition?: boolean;
  duration?: number;
}

export function SplashScreen({ 
  onComplete, 
  autoTransition = false, 
  duration = 7000 
}: SplashScreenProps) {
  const prefersReduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<'orbs' | 'transform' | 'swarm' | 'fadeout'>('orbs');
  const [showWordmark, setShowWordmark] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isInteracted, setIsInteracted] = useState(false);
  const timersRef = useRef<number[]>([]);
  
  // Get vibe colors as array
  const vibeColorValues = Object.values(VIBE_COLORS);
  
  // Use canvas animation hook
  const { canvasRef } = useCanvasAnimation({
    onDone: onComplete,
    prefersReducedMotion: prefersReduced,
    vibeColors: vibeColorValues,
    phase,
  });

  // Set splash as seen immediately when component mounts
  useEffect(() => {
    const markSplashSeen = async () => {
      try {
        await storage.setItem('floq_splash_seen', 'true');
      } catch (error) {
        console.warn('Failed to mark splash as seen:', error);
      }
    };
    markSplashSeen();
  }, []);

  // Phase timing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear any existing timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
    
    if (prefersReduced) {
      // Reduced motion - quick transition
      const timer = window.setTimeout(() => {
        setShowWordmark(true);
        setShowButton(true);
      }, 500);
      timersRef.current.push(timer);
      return () => {
        window.clearTimeout(timer);
        timersRef.current = [];
      };
    }

    const t1 = window.setTimeout(() => setShowWordmark(true), 1000);
    timersRef.current.push(t1);

    // Phase 2: Show enter button
    const t2 = window.setTimeout(() => setShowButton(true), 2000);
    timersRef.current.push(t2);

    // Auto transition if enabled
    if (autoTransition && !isInteracted) {
      const t3 = window.setTimeout(() => startTransition(), duration - 3000);
      timersRef.current.push(t3);
    }

    return () => {
      timersRef.current.forEach(timer => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [autoTransition, duration, isInteracted, prefersReduced]);

  const startTransition = () => {
    if (isInteracted || typeof window === 'undefined') return;
    setIsInteracted(true);
    
    if (prefersReduced) {
      // Simple fade for reduced motion
      setPhase('fadeout');
      setTimeout(() => onComplete?.(), 1000);
      return;
    }

    // Start transformation sequence
    setPhase('transform');
    setTimeout(() => setPhase('swarm'), 1000);
    setTimeout(() => setPhase('fadeout'), 2500);
    setTimeout(() => onComplete?.(), 3500);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  const handleEnterClick = async () => {
    // Add haptics for mobile
    if (Platform.OS !== 'web') {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    startTransition();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#020202] to-[#0e0f12] overflow-hidden">
      {/* Canvas for animations - only on web */}
      {!prefersReduced && Platform.OS === 'web' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'transparent' }}
        />
      )}

      {/* Static fallback for reduced motion or native */}
      {(prefersReduced || Platform.OS !== 'web') && (
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-muted/20" />
          {Platform.OS !== 'web' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent opacity-60 animate-pulse"
                role="img"
                aria-label="Floq galaxy splash"
              />
            </div>
          )}
        </div>
      )}

      {/* Particle field for subtle background - web only */}
      {Platform.OS === 'web' && (
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 30 }).map((_, i) => (
            <MotionDiv
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={Platform.OS === 'web' ? {
                opacity: [0.2, 0.8, 0.2],
                scale: [0.5, 1, 0.5],
              } : {}}
              transition={Platform.OS === 'web' ? {
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 2,
              } : {}}
            />
          ))}
        </div>
      )}

      {/* Floq Wordmark */}
      <AnimatePresence>
        {showWordmark && (
          <MotionDiv
            initial={Platform.OS === 'web' ? { opacity: 0, y: 20 } : {}}
            animate={Platform.OS === 'web' ? { opacity: 0.8, y: 0 } : { opacity: 0.8 }}
            exit={Platform.OS === 'web' ? { opacity: 0, scale: 1.2 } : { opacity: 0 }}
            transition={Platform.OS === 'web' ? { duration: 1, ease: "easeOut" } : {}}
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <h1 
              className="text-6xl md:text-8xl font-thin text-white tracking-wider"
              role="img"
              aria-label="Floq logo"
            >
              floq
            </h1>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Enter Button */}
      <AnimatePresence>
        {showButton && !isInteracted && (
          <MotionDiv
            initial={Platform.OS === 'web' ? { opacity: 0, y: 40 } : {}}
            animate={Platform.OS === 'web' ? { opacity: 1, y: 0 } : { opacity: 1 }}
            exit={Platform.OS === 'web' ? { opacity: 0, scale: 0.9 } : { opacity: 0 }}
            transition={Platform.OS === 'web' ? { duration: 0.8, ease: "easeOut" } : {}}
            className="absolute bottom-[20%] left-1/2 transform -translate-x-1/2"
          >
            <Button
              onClick={handleEnterClick}
              disabled={isInteracted}
              variant="outline"
              size="lg"
              aria-label="Enter Floq"
              className="relative overflow-hidden bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300 rounded-xl px-8 py-4 text-lg font-medium hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MotionSpan
                whileHover={!isInteracted && Platform.OS === 'web' ? { scale: 1.05 } : {}}
                whileTap={!isInteracted && Platform.OS === 'web' ? { scale: 0.95 } : {}}
                className={isInteracted ? "animate-pulse" : ""}
              >
                {isInteracted ? 'Entering...' : 'Enter'}
              </MotionSpan>
            </Button>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* White fadeout overlay */}
      <AnimatePresence>
        {phase === 'fadeout' && (
          <MotionDiv
            initial={Platform.OS === 'web' ? { opacity: 0 } : {}}
            animate={Platform.OS === 'web' ? { opacity: 1 } : { opacity: 1 }}
            transition={Platform.OS === 'web' ? { duration: 1.5 } : {}}
            className="absolute inset-0 bg-white z-50"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
