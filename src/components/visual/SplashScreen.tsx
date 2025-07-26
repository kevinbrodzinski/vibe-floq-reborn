import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { VIBE_COLORS } from '@/constants/vibes';
import { Button } from '@/components/ui/button';

interface SplashScreenProps {
  onComplete: () => void;
  autoTransition?: boolean;
  duration?: number;
}

interface Orb {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  angle: number;
  opacity: number;
}

interface Bird {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  size: number;
}

export function SplashScreen({ 
  onComplete, 
  autoTransition = false, 
  duration = 7000 
}: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const prefersReduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<'orbs' | 'transform' | 'swarm' | 'fadeout'>('orbs');
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [showWordmark, setShowWordmark] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isInteracted, setIsInteracted] = useState(false);

  // Initialize orbs with vibe colors
  useEffect(() => {
    const vibeColorValues = Object.values(VIBE_COLORS);
    const initialOrbs: Orb[] = Array.from({ length: 16 }, (_, i) => ({
      id: `orb-${i}`,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 120 + 40, // 40-160px
      color: vibeColorValues[i % vibeColorValues.length],
      speed: Math.random() * 0.5 + 0.2,
      angle: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.6 + 0.3
    }));
    setOrbs(initialOrbs);
  }, []);

  // Phase timing
  useEffect(() => {
    if (prefersReduced) {
      // Reduced motion - quick transition
      const timer = window.setTimeout(() => {
        setShowWordmark(true);
        setShowButton(true);
      }, 500);
      return () => window.clearTimeout(timer);
    }

    const timers: number[] = [];

    // Phase 1: Show wordmark
    timers.push(window.setTimeout(() => setShowWordmark(true), 1000));

    // Phase 2: Show enter button
    timers.push(window.setTimeout(() => setShowButton(true), 2000));

    // Auto transition if enabled
    if (autoTransition && !isInteracted) {
      timers.push(window.setTimeout(() => startTransition(), duration - 3000));
    }

    return () => timers.forEach(window.clearTimeout);
  }, [autoTransition, duration, isInteracted, prefersReduced]);

  const startTransition = () => {
    if (isInteracted) return;
    setIsInteracted(true);
    
    if (prefersReduced) {
      // Simple fade for reduced motion
      setPhase('fadeout');
      window.setTimeout(onComplete, 1000);
      return;
    }

    // Start transformation sequence
    setPhase('transform');
    
    // Convert orbs to birds
    const newBirds: Bird[] = orbs.map(orb => ({
      id: orb.id,
      x: orb.x,
      y: orb.y,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      speed: Math.random() * 8 + 4,
      size: Math.random() * 20 + 10
    }));
    setBirds(newBirds);

    window.setTimeout(() => setPhase('swarm'), 1000);
    window.setTimeout(() => setPhase('fadeout'), 2500);
    window.setTimeout(onComplete, 3500);
  };

  // Canvas animation
  useEffect(() => {
    if (prefersReduced || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (phase === 'orbs') {
        // Draw floating orbs
        orbs.forEach(orb => {
          ctx.save();
          ctx.globalAlpha = orb.opacity;
          
          // Create radial gradient for orb
          const gradient = ctx.createRadialGradient(
            orb.x, orb.y, 0,
            orb.x, orb.y, orb.size / 2
          );
          gradient.addColorStop(0, orb.color.replace('hsl(', 'hsla(').replace(')', ', 0.8)'));
          gradient.addColorStop(1, orb.color.replace('hsl(', 'hsla(').replace(')', ', 0.1)'));
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Gentle floating motion
          orb.x += Math.cos(orb.angle) * orb.speed;
          orb.y += Math.sin(orb.angle) * orb.speed;
          orb.angle += 0.01;

          // Keep in bounds
          if (orb.x < 0 || orb.x > window.innerWidth) orb.speed *= -1;
          if (orb.y < 0 || orb.y > window.innerHeight) orb.speed *= -1;
        });
      } else if (phase === 'transform' || phase === 'swarm') {
        // Draw birds swarming to center
        birds.forEach(bird => {
          ctx.save();
          ctx.globalAlpha = phase === 'swarm' ? 1 : 0.9;
          ctx.fillStyle = 'white';
          
          // Simple bird shape
          ctx.translate(bird.x, bird.y);
          ctx.rotate(Math.atan2(bird.targetY - bird.y, bird.targetX - bird.x));
          ctx.fillRect(-bird.size / 2, -2, bird.size, 4);
          ctx.fillRect(-bird.size / 4, -1, bird.size / 2, 2);
          ctx.restore();

          // Move towards center
          const dx = bird.targetX - bird.x;
          const dy = bird.targetY - bird.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) {
            bird.x += (dx / distance) * bird.speed;
            bird.y += (dy / distance) * bird.speed;
          }

          // Increase speed as they get closer
          if (phase === 'swarm') {
            bird.speed += 0.5;
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [orbs, birds, phase, prefersReduced]);

  const handleEnterClick = () => {
    startTransition();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#020202] to-[#0e0f12] overflow-hidden">
      {/* Canvas for animations */}
      {!prefersReduced && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'transparent' }}
        />
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
            <h1 className="text-6xl md:text-8xl font-thin text-white tracking-wider">
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
              variant="outline"
              size="lg"
              className="relative overflow-hidden bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300 rounded-xl px-8 py-4 text-lg font-medium hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Enter
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
