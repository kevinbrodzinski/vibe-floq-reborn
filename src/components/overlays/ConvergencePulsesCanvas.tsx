import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureCollection } from 'geojson';
import { useViewportInput } from '@/lib/map/useViewportInput';
import { getVibeToken } from '@/lib/tokens/vibeTokens';

type Zone = { polygon: [number, number][], prob: number, vibe: string };
type Resp = { zones: Zone[]; ttlSec: number };

export function ConvergencePulsesCanvas({ map, active }: { map: any; active: boolean }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const { viewport, viewportKey } = useViewportInput({ defaultRadius: 900 });
  const q = useQuery({
    queryKey: ['convergence-pulses', viewportKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Resp>('convergence-zones', {
        body: { center: viewport.center, bbox: viewport.bbox, zoom: viewport.zoom, friends: [] }
      });
      if (error) throw error; return data!;
    },
    staleTime: 120_000, enabled: !!map && active
  });

  // Resize canvas
  React.useEffect(() => {
    const cvs = ref.current; if (!cvs) return;
    const parent = cvs.parentElement || document.body;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || window.innerHeight;
      cvs.style.width = w + 'px'; cvs.style.height = h + 'px';
      cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr);
      const ctx = cvs.getContext('2d'); if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(parent);
    window.addEventListener('resize', resize);
    return () => { ro.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  // Pulse animation
  React.useEffect(() => {
    const cvs = ref.current; const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;
    let raf = 0;

    function centroid(poly: [number,number][]) {
      let x=0,y=0; for (const p of poly) { x += p[0]; y += p[1]; }
      return [x/poly.length, y/poly.length] as [number,number];
    }

    function draw() {
      const w = cvs.clientWidth, h = cvs.clientHeight;
      ctx.clearRect(0, 0, w, h);
      if (active && q.data?.zones?.length) {
        ctx.globalCompositeOperation = 'lighter'; // additive glow
        for (const z of q.data.zones) {
          const cLngLat = centroid(z.polygon);
          const p = map.project(cLngLat); // device pixels
          const t = getVibeToken(z.vibe as any);
          const baseR = 18 + (z.prob ?? 0.5) * 24;

          // three expanding rings
          const now = performance.now();
          for (let i=0;i<3;i++) {
            const phase = ((now/1000 + i*0.6) % 2.4) / 2.4; // 0..1
            const r = baseR + phase * 60;
            const alpha = (1 - phase) * 0.35;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI*2);
            ctx.strokeStyle = t.glow;
            ctx.lineWidth = 2.2;
            ctx.globalAlpha = alpha;
            ctx.stroke();
            // soft fill
            ctx.globalAlpha = alpha * 0.25;
            ctx.fillStyle = t.glow;
            ctx.beginPath(); ctx.arc(p.x, p.y, r*0.65, 0, Math.PI*2); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, q.data, map]);

  return (
    <canvas
      ref={ref}
      style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex: 540, opacity: active ? 1 : 0, transition:'opacity 200ms' }}
    />
  );
}