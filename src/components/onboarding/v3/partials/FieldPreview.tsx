import { memo, useEffect, useRef, useMemo } from 'react';

type Cluster = { x: number; y: number; r: number };

// Read from CSS variables with fallbacks (low luminance)
const getCanvasColors = () => {
  if (typeof document === 'undefined') {
    return {
      GRID_LINE: 'rgba(255,255,255,0.03)',
      GLOW_INNER: 'rgba(140,120,255,0.25)',
      GLOW_OUTER: 'rgba(140,120,255,0.00)',
      DOT_FILL: 'rgba(170,150,255,0.55)',
      LINE_GLINT: 'rgba(180,160,255,0.20)'
    };
  }
  const css = getComputedStyle(document.documentElement);
  return {
    GRID_LINE: css.getPropertyValue('--grid-line').trim() || 'rgba(255,255,255,0.03)',
    GLOW_INNER: css.getPropertyValue('--field-glow-inner').trim() || 'rgba(140,120,255,0.25)',
    GLOW_OUTER: css.getPropertyValue('--field-glow-outer').trim() || 'rgba(140,120,255,0.00)',
    DOT_FILL: css.getPropertyValue('--field-dot-fill').trim() || 'rgba(170,150,255,0.55)',
    LINE_GLINT: css.getPropertyValue('--field-line-glint').trim() || 'rgba(180,160,255,0.20)'
  };
};

export const FieldPreview = memo(function FieldPreview() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const clusters = useMemo<Cluster[]>(() => ([
    { x: 90,  y: 120, r: 16 },
    { x: 212, y: 82,  r: 24 },
    { x: 160, y: 184, r: 13 },
  ]), []);

  function drawFrame(ctx: CanvasRenderingContext2D, t: number, clusters: Cluster[]) {
    const colors = getCanvasColors();
    const { width: w, height: h } = ctx.canvas;
    ctx.clearRect(0, 0, w, h);
    
    // faint grid (lower luminance)
    ctx.strokeStyle = colors.GRID_LINE;
    ctx.lineWidth = 0.5;
    const step = 36;
    for (let x = step; x < w; x += step) { 
      ctx.beginPath(); 
      ctx.moveTo(x, 0); 
      ctx.lineTo(x, h); 
      ctx.stroke(); 
    }
    for (let y = step; y < h; y += step) { 
      ctx.beginPath(); 
      ctx.moveTo(0, y); 
      ctx.lineTo(w, y); 
      ctx.stroke(); 
    }

    // soft clusters
    clusters.forEach((c, i) => {
      const pulse = 0.90 + 0.10 * Math.sin((t / 1000) + i);
      const r = c.r * pulse;
      const g = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, r * 3.2);
      g.addColorStop(0, colors.GLOW_INNER);
      g.addColorStop(1, colors.GLOW_OUTER);
      ctx.fillStyle = g;
      ctx.beginPath(); 
      ctx.arc(c.x, c.y, r * 3.2, 0, Math.PI * 2); 
      ctx.fill();

      ctx.fillStyle = colors.DOT_FILL;
      ctx.beginPath(); 
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2); 
      ctx.fill();
    });

    // faint cross-line sparkle
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = colors.LINE_GLINT;
    ctx.lineWidth = 1;
    const cx = (clusters[0].x + clusters[1].x + clusters[2].x) / 3;
    const cy = (clusters[0].y + clusters[1].y + clusters[2].y) / 3;
    const sweep = 18 + 6 * Math.sin(t / 800);
    ctx.beginPath(); 
    ctx.moveTo(cx - 60, cy + sweep); 
    ctx.lineTo(cx + 60, cy - sweep); 
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
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

  // OPEN variant - no container frame
  return <canvas ref={ref} className="w-full h-[220px]" />;
});
