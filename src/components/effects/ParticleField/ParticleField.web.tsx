import React, { useEffect, useRef } from 'react';

type Props = {
  count?: number;
  color?: string;   // brand token hex; if present it takes precedence
  hue?: number;     // 0..360 base hue for atmospheric effects
  drift?: boolean;  // enable subtle "living" drift (±6°)
  className?: string;
};

export function ParticleField({ count = 14, color, hue, drift = false, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const prefersReduced =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const resize = () => {
      const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    // Static seeds (avoid per-frame alloc) + tiny per-particle hue jitter
    const seeds = Array.from({ length: count }).map(() => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 1.5,
      hueJitter: (Math.random() - 0.5) * 4, // ±2°
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      // Compute animated drift once per frame (UI-thread friendly)
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const driftDeg = drift ? Math.sin(t * 0.001) * 6 : 0; // ±6°
      const baseHue = typeof hue === 'number' ? hue : undefined;

      for (const p of seeds) {
        // integrate
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.clientWidth) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.clientHeight) p.vy *= -1;

        // draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

        // Precedence: color (hex) → hsla(hue+drift+jitter) → fallback
        const effectiveFill = color
          ? color
          : `hsla(${(((baseHue ?? 255) + driftDeg + p.hueJitter) % 360 + 360) % 360}, 75%, 65%, 0.7)`;

        ctx.fillStyle = effectiveFill;
        ctx.shadowColor = effectiveFill;
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [count, color, hue, drift]);

  return (
    <canvas
      ref={ref}
      className={['pointer-events-none absolute inset-0', className].filter(Boolean).join(' ')}
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
