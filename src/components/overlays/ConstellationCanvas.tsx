// src/components/overlays/ConstellationCanvas.tsx
// Abstract relation graph overlay (0..1 space). No GPS; pointer-events: none.
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchConstellation, type ConstellationNode, type ConstellationEdge } from '@/lib/api/constellationClient';
import { getVibeToken } from '@/lib/tokens/vibeTokens';

type Props = {
  active: boolean; // show/hide overlay & animation
  party: { id: string; mass?: number; vibe?: string }[];
  edges?: ConstellationEdge[];
  seed?: string;
  className?: string;
  highlightId?: string;
};

export function ConstellationCanvas({ active, party, edges = [], seed, className, highlightId }: Props) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);

  const q = useQuery({
    queryKey: ['constellation', party.map(p => p.id).join(','), edges.length, seed],
    queryFn: () => fetchConstellation({ party, edges, seed }),
    staleTime: 120_000,
    enabled: active && party.length > 0,
  });

  // Resize canvas to parent
  React.useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const parent = cvs.parentElement || document.body;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || window.innerHeight;
      cvs.style.width = w + 'px';
      cvs.style.height = h + 'px';
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      const ctx = cvs.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    window.addEventListener('resize', resize);
    return () => { ro.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  // Simple render loop
  React.useEffect(() => {
    const cvs = ref.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;

    let raf = 0;
    let t0 = performance.now();

    function draw() {
      if (!active) { raf = requestAnimationFrame(draw); return; }
      const data = q.data;
      const w = cvs.clientWidth, h = cvs.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (data?.nodes?.length) {
        // edges first
        ctx.lineCap = 'round';
        for (const e of data.edges ?? []) {
          const a = data.nodes.find(n => n.id === e.a);
          const b = data.nodes.find(n => n.id === e.b);
          if (!a || !b) continue;
          const s = Math.max(0.1, Math.min(1, e.strength));
          const ax = a.pos[0] * w, ay = a.pos[1] * h;
          const bx = b.pos[0] * w, by = b.pos[1] * h;
          ctx.globalAlpha = 0.15 * s;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 * s;
          ctx.beginPath();
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }

        // nodes
        const now = performance.now();
        const breath = 0.5 + 0.5 * Math.sin((now % 4000) / 4000 * Math.PI * 2);
        for (const n of data.nodes) {
          const t = getVibeToken(n.vibe as any);
          const x = n.pos[0] * w, y = n.pos[1] * h;
          const r = 4 + (n.mass ?? 1) * 3 + breath * 1.5;

          // glow
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = t.glow;
          ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.fill();

          // core
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = t.base;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

          // ring
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = t.ring;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.stroke();
        }

        // highlight selected node
        if (highlightId) {
          const n = data.nodes.find(nn => nn.id === highlightId);
          if (n) {
            const x = n.pos[0] * w, y = n.pos[1] * h;
            const r = 16 + (n.mass ?? 1) * 5;

            // outer glow ring
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();

            // dashed orbit
            ctx.globalAlpha = 0.35;
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, q.data]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none', // never block map gestures
        opacity: active ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    />
  );
}