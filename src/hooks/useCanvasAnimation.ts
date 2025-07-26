import { useRef, useLayoutEffect } from 'react';

interface Orb {
  id: string;
  x: number;
  y: number;
  size: number;
  innerColor: string;
  outerColor: string;
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

interface UseCanvasAnimationProps {
  onDone: () => void;
  prefersReducedMotion: boolean;
  vibeColors: string[];
  phase: 'orbs' | 'transform' | 'swarm' | 'fadeout';
}

export function useCanvasAnimation({
  onDone,
  prefersReducedMotion,
  vibeColors,
  phase,
}: UseCanvasAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>();
  const orbsRef = useRef<Orb[]>([]);
  const birdsRef = useRef<Bird[]>([]);
  const phaseRef = useRef<'orbs' | 'transform' | 'swarm' | 'fadeout'>('orbs');

  // Initialize orbs once
  const initializeOrbs = () => {
    if (typeof window === 'undefined') return;
    
    orbsRef.current = Array.from({ length: 16 }, (_, i) => {
      const color = vibeColors[i % vibeColors.length];
      return {
        id: `orb-${i}`,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 120 + 40, // 40-160px
        innerColor: color.replace('hsl(', 'hsla(').replace(')', ', 0.8)'),
        outerColor: color.replace('hsl(', 'hsla(').replace(')', ', 0.1)'),
        speed: Math.random() * 0.5 + 0.2,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.6 + 0.3
      };
    });
  };

  const transformOrbsToBirds = () => {
    if (typeof window === 'undefined') return;
    
    birdsRef.current = orbsRef.current.map(orb => ({
      id: orb.id,
      x: orb.x,
      y: orb.y,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      speed: Math.random() * 8 + 4,
      size: Math.random() * 20 + 10
    }));
  };

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize orbs on first mount
    if (orbsRef.current.length === 0) {
      initializeOrbs();
    }

    const resizeCanvas = () => {
      if (typeof window === 'undefined') return;
      
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      // Reset transform to avoid accumulation
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    const animate = () => {
      if (typeof window === 'undefined') return;
      
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      phaseRef.current = phase;

      if (phaseRef.current === 'orbs') {
        // Draw floating orbs
        orbsRef.current.forEach(orb => {
          ctx.save();
          ctx.globalAlpha = orb.opacity;
          
          // Use pre-computed gradient colors
          const gradient = ctx.createRadialGradient(
            orb.x, orb.y, 0,
            orb.x, orb.y, orb.size / 2
          );
          gradient.addColorStop(0, orb.innerColor);
          gradient.addColorStop(1, orb.outerColor);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Gentle floating motion with angle wrapping
          orb.x += Math.cos(orb.angle) * orb.speed;
          orb.y += Math.sin(orb.angle) * orb.speed;
          orb.angle = (orb.angle + 0.01) % (Math.PI * 2);

          // Keep in bounds
          if (orb.x < 0 || orb.x > window.innerWidth) orb.speed *= -1;
          if (orb.y < 0 || orb.y > window.innerHeight) orb.speed *= -1;
        });
      } else if (phaseRef.current === 'transform' || phaseRef.current === 'swarm') {
        // Initialize birds if needed
        if (birdsRef.current.length === 0) {
          transformOrbsToBirds();
        }

        // Draw birds swarming to center
        birdsRef.current.forEach(bird => {
          ctx.save();
          ctx.globalAlpha = phaseRef.current === 'swarm' ? 1 : 0.9;
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
          if (phaseRef.current === 'swarm') {
            bird.speed += 0.5;
          }
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [phase, prefersReducedMotion, vibeColors]);

  // Transform orbs to birds when phase changes
  useLayoutEffect(() => {
    if (phase === 'transform' && birdsRef.current.length === 0) {
      transformOrbsToBirds();
    }
  }, [phase]);

  return { canvasRef };
}
