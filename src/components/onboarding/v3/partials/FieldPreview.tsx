import { memo, useEffect, useRef, useMemo } from 'react';

type Cluster = { x: number; y: number; r: number };

const GLOW_INNER = 'rgba(160,140,255,0.85)';
const GLOW_OUTER = 'rgba(160,140,255,0.00)';
const DOT_FILL = 'rgba(200,180,255,0.9)';
const GRID_LINE = 'rgba(255,255,255,0.04)';

export const FieldPreview = memo(function FieldPreview() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const clusters = useMemo<Cluster[]>(() => ([
    { x: 90,  y: 120, r: 18 },
    { x: 210, y: 80,  r: 26 },
    { x: 160, y: 180, r: 14 },
  ]), []);

  function drawFrame(ctx: CanvasRenderingContext2D, t: number, clusters: Cluster[]) {
    const { width: w, height: h } = ctx.canvas;
    ctx.clearRect(0, 0, w, h);
    // faint grid
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    const step = 36;
    for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    clusters.forEach((c, i) => {
      const pulse = 0.85 + 0.15 * Math.sin((t / 1000) + i);
      const r = c.r * pulse;
      const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, r * 3);
      g.addColorStop(0, GLOW_INNER);
      g.addColorStop(1, GLOW_OUTER);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, r * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = DOT_FILL;
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
    });
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext('2d', { alpha: true });
    if (!ctx) return;

    // DPI scale
    function resize() {
      const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
      const rect = el.getBoundingClientRect();
      el.width = Math.floor(rect.width * dpr);
      el.height = Math.floor(220 * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = !!media?.matches;

    const loop = (t: number) => {
      drawFrame(ctx, t, clusters);
      if (!reduced) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const onResize = () => resize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
      media?.addEventListener('change', onResize);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize);
        media?.removeEventListener('change', onResize);
      }
    };
  }, [clusters]);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden">
      <canvas ref={ref} className="w-full h-[220px]" />
    </div>
  );
});
