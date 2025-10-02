import { memo, useEffect, useRef } from 'react';

type Cluster = { x: number; y: number; r: number; a: number };

function seed(): Cluster[] {
  // 3–5 soft clusters for the mock; deterministic seed
  return [
    { x: 90, y: 120, r: 18, a: 0.8 },
    { x: 210, y: 80, r: 26, a: 0.9 },
    { x: 160, y: 180, r: 14, a: 0.75 },
  ];
}

export const FieldPreview = memo(function FieldPreview() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const clusters = seed();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    function draw(t: number) {
      const w = el.width, h = el.height;
      ctx.clearRect(0, 0, w, h);
      // faint grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      const step = 36;
      for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      // clusters
      clusters.forEach((c, i) => {
        const pulse = 0.85 + 0.15 * Math.sin((t / 1000) + i);
        const r = c.r * pulse;
        const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, r * 3);
        g.addColorStop(0, 'rgba(160,140,255,0.85)');
        g.addColorStop(1, 'rgba(160,140,255,0.00)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c.x, c.y, r * 3, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(200,180,255,0.9)';
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [clusters]);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden">
      <canvas ref={ref} width={300} height={220} className="w-full h-[220px]" />
    </div>
  );
});
