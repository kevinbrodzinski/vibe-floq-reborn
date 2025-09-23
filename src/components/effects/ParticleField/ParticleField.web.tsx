import React, { useEffect, useRef } from 'react';
import { colors } from '@/lib/theme-tokens.web';

type Props = {
  count?: number;
  hue?: number;
  color?: string;   // token color wins over hue  
  drift?: boolean;  // enable subtle hue drift for "living" effect
  className?: string;
};

export function ParticleField({ count = 14, hue, color, drift = false, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const prefersReduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (prefersReduced) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const resize = () => {
      const dpr = devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // static seeds (avoid per-frame alloc) with per-particle hue jitter
    const seeds = Array.from({ length: count }).map(() => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 1.5,
      hueJitter: (Math.random() - 0.5) * 4, // ±2° per particle
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      
      // compute animated hue only once per frame
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const driftDeg = drift ? Math.sin(t * 0.001) * 6 : 0; // ±6°
      const baseHue = typeof hue === 'number' ? hue : undefined;
      
      for (const p of seeds) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.clientWidth) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.clientHeight) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        
        const fill = color
          ? color
          : `hsla(${(((baseHue ?? 255) + driftDeg + p.hueJitter) % 360 + 360) % 360}, 75%, 65%, 0.7)`;

        ctx.fillStyle = fill;
        ctx.shadowColor = fill;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [count, hue, color, drift]);

  return (
    <canvas
      ref={ref}
      className={['pointer-events-none absolute inset-0', className].filter(Boolean).join(' ')}
      style={{ mixBlendMode: 'screen' }}
    />
  );
}