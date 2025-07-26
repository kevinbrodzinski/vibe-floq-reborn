import { useRef, useLayoutEffect, useMemo } from 'react';
import { VIBE_RGB, VIBE_ORDER } from '@/constants/vibes';

// Helper to convert RGB to HSL string for Canvas API
const rgbToHsl = (r: number, g: number, b: number, alpha: number = 1): string => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;
  const l = sum / 2;
  
  let h = 0;
  let s = 0;
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    
    switch (max) {
      case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / diff + 2) / 6; break;
      case b: h = ((r - g) / diff + 4) / 6; break;
    }
  }
  
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${alpha})`;
};

interface Orb {
  id: string;
  x: number;
  y: number;
  size: number;
  innerColor: string;
  outerColor: string;
  gradient: CanvasGradient | null;
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
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Memoize orb initialization to respond to vibeColors changes
  const initialOrbs = useMemo(() => {
    if (typeof window === 'undefined') return [];
    
    return Array.from({ length: 16 }, (_, i) => {
      // Use VIBE_RGB values instead of CSS custom properties
      const vibeIndex = i % VIBE_ORDER.length;
      const vibeName = VIBE_ORDER[vibeIndex];
      const [r, g, b] = VIBE_RGB[vibeName];
      
      return {
        id: `orb-${i}`,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 120 + 40, // TODO: Use design tokens
        innerColor: rgbToHsl(r, g, b, 0.8),
        outerColor: rgbToHsl(r, g, b, 0.1),
        gradient: null, // Will be created once
        speed: Math.random() * 0.5 + 0.2,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.6 + 0.3
      };
    });
  }, [vibeColors.join(',')]);

  // Update orbs when vibeColors change
  useLayoutEffect(() => {
    orbsRef.current = initialOrbs;
    birdsRef.current = []; // Reset birds when orbs change
  }, [initialOrbs]);

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
      // Cancel any running animation
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctxRef.current = ctx;

    const resizeCanvas = () => {
      if (typeof window === 'undefined' || !ctx) return;
      
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      // Reset transform to avoid accumulation
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Invalidate cached gradients on resize
      orbsRef.current.forEach(orb => orb.gradient = null);
    };

    resizeCanvas();
    
    const handleResize = () => resizeCanvas();
    const handleOrientationChange = () => {
      // Handle mobile orientation changes
      setTimeout(resizeCanvas, 100);
    };
    
    window.addEventListener('resize', handleResize);
    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    const animate = () => {
      // Guard against reduced motion changes during animation
      if (prefersReducedMotion || typeof window === 'undefined' || !ctx) {
        return;
      }
      
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      phaseRef.current = phase;

      if (phaseRef.current === 'orbs') {
        // Draw floating orbs
        orbsRef.current.forEach(orb => {
          ctx.save();
          ctx.globalAlpha = orb.opacity;
          
          // Cache gradient to avoid recreation
          if (!orb.gradient) {
            orb.gradient = ctx.createRadialGradient(
              orb.x, orb.y, 0,
              orb.x, orb.y, orb.size / 2
            );
            orb.gradient.addColorStop(0, orb.innerColor);
            orb.gradient.addColorStop(1, orb.outerColor);
          }
          
          ctx.fillStyle = orb.gradient;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Gentle floating motion with angle wrapping
          orb.x += Math.cos(orb.angle) * orb.speed;
          orb.y += Math.sin(orb.angle) * orb.speed;
          orb.angle = (orb.angle + 0.01) % (Math.PI * 2);

          // Invalidate gradient cache when position changes significantly
          if (orb.gradient) {
            orb.gradient = null;
          }

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

          // Increase speed as they get closer (with clamp to prevent runaway)
          if (phaseRef.current === 'swarm') {
            bird.speed = Math.min(bird.speed + 0.5, 30); // Clamp max speed
          }
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (typeof screen !== 'undefined' && screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
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
