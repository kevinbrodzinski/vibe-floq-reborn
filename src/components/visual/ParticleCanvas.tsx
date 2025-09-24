import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  life: number;
}

const PARTICLE_COUNT = 80;
const COLOR = 'hsla(var(--primary), 0.12)';

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  /* ------------------------------------------------------------------ *
   * Animation loop with proper cleanup
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (prefersReduced) return;                     // skip for a11y

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let w = canvas.width  = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let rafId: number;

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 3 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      life: Math.random() * 100
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.6;

        if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          // reset particle
          p.x = Math.random() * w;
          p.y = Math.random() * h;
          p.r = Math.random() * 3 + 1;
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = (Math.random() - 0.5) * 0.4;
          p.life = Math.random() * 100 + 50;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = COLOR;
        ctx.fill();
      });

      rafId = requestAnimationFrame(draw);
    };

    draw();

    const resize = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [prefersReduced]);

  /* ------------------------------------------------------------------ */
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}