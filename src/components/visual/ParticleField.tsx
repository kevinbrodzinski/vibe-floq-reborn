import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface Props {
  colour?: string;          // defaults to hsla(var(--primary)/.45)
  density?: number;         // 30-60 looks nice
}

export function ParticleField({ colour, density = 40 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReduced || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d')!;
    let width = (canvasRef.current.width = window.innerWidth);
    let height = (canvasRef.current.height = window.innerHeight);
    let raf: number;

    const stars = Array.from({ length: density }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2 + 0.3,
      s: Math.random() * 0.6 + 0.2,
    }));

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle =
        colour ?? `hsla(var(--primary) / .45)`;

      stars.forEach(star => {
        star.y += star.s;
        if (star.y > height) star.y = 0;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => {
      width = canvasRef.current!.width = window.innerWidth;
      height = canvasRef.current!.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [colour, density, prefersReduced]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden
    />
  );
}