import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useCanvasAnimation } from '@/hooks/useCanvasAnimation';
import { VIBE_COLORS } from '@/constants/vibes';
import { Button } from '@/components/ui/button';
import { safePlatform } from '@/types/enums/platform';

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
  const platform = safePlatform(typeof window !== 'undefined' ? 'web' : 'web');
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
    if (typeof window !== 'undefined') {
      // Mark splash as seen right away to make it truly one-time
      localStorage.setItem('floq_splash_seen', 'true');
    }
  }, []);

  // Phase timing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear any existing timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
    
    if (prefersReduced) {
      // Reduced motion - quick transition
      const timer = setTimeout(() => {
        setShowWordmark(true);
        setShowButton(true);
      }, 500);
      timersRef.current.push(timer);
      return () => {
        clearTimeout(timer);
        timersRef.current = [];
      };
    }

    // Phase 1: Show wordmark
    timersRef.current.push(setTimeout(() => setShowWordmark(true), 1000));

    // Phase 2: Show enter button
    timersRef.current.push(setTimeout(() => setShowButton(true), 2000));

    // Auto transition if enabled
    if (autoTransition && !isInteracted) {
      timersRef.current.push(setTimeout(() => startTransition(), duration - 3000));
    }

    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
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
      timersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const handleEnterClick = () => {
    startTransition();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#020202] to-[#0e0f12] overflow-hidden">
      {/* Canvas for animations - only on web */}
      {!prefersReduced && platform === 'web' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'transparent' }}
        />
      )}

      {/* Static fallback for reduced motion */}
      {prefersReduced && (
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-muted/20" />
        </div>
      )}

      {/* Particle field for subtle background */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Floq Wordmark */}
      <AnimatePresence>
        {showWordmark && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <h1 
              className="text-6xl md:text-8xl font-thin text-white tracking-wider"
              role="img"
              aria-label="Floq logo"
            >
              floq
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enter Button */}
      <AnimatePresence>
        {showButton && !isInteracted && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute bottom-[20%] left-1/2 transform -translate-x-1/2"
          >
            <Button
              onClick={handleEnterClick}
              disabled={isInteracted}
              variant="outline"
              size="lg"
              aria-label="Enter splash screen"
              className="relative overflow-hidden bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300 rounded-xl px-8 py-4 text-lg font-medium hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <motion.span
                whileHover={!isInteracted ? { scale: 1.05 } : {}}
                whileTap={!isInteracted ? { scale: 0.95 } : {}}
                className={isInteracted ? "animate-pulse" : ""}
              >
                {isInteracted ? 'Entering...' : 'Enter'}
              </motion.span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* White fadeout overlay */}
      <AnimatePresence>
        {phase === 'fadeout' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-white z-50"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
