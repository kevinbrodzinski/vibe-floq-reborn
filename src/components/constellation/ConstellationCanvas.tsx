import * as React from "react";
import { cssHsl } from "@/lib/cssVar";

type Node = {
  id: string;
  name: string;
  status: "live" | "upcoming";
  participants: number;
  friends_in?: number;
  score: number; // 0..1
};

type Edge = { 
  a: string; 
  b: string; 
  w: number; 
  kind: "time" | "friend" 
};

export function ConstellationCanvas({ nodes, edges = [] }: { nodes: Node[]; edges?: Edge[] }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const ro = new ResizeObserver(() => layout());
    ro.observe(canvas);

    const hovered = { i: -1 }; // mutable ref-like

    function layout() {
      // account for DPR properly
      const DPR = Math.max(1, window.devicePixelRatio || 1);
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.max(1, Math.floor(w * DPR));
      canvas.height = Math.max(1, Math.floor(h * DPR));
      // draw uses device pixels; we'll set a transform each frame
    }

    function toLocal(e: MouseEvent, canvas: HTMLCanvasElement) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function nearestNodeIndex(x: number, y: number) {
      // Recompute same layout to check distance cheaply
      const DPR = Math.max(1, window.devicePixelRatio || 1);
      const w = canvas.width / DPR, h = canvas.height / DPR;
      const maxR = Math.min(w, h) * 0.45, cx = w/2, cy = h/2;

      let best = -1, bestD2 = 1e12;
      const capped = nodes.slice(0, 60);
      for (let i = 0; i < capped.length; i++) {
        const n = capped[i];
        const rho = 60 + (1 - n.score) * maxR;
        const theta = ((i * 137.508) % 360) * (Math.PI / 180);
        const nx = cx + rho * Math.cos(theta);
        const ny = cy + rho * Math.sin(theta);
        const dx = nx - x, dy = ny - y;
        const d2 = dx*dx + dy*dy;
        if (d2 < bestD2) { bestD2 = d2; best = i; }
      }
      // Hover radius ~ 28px
      return bestD2 <= 28*28 ? best : -1;
    }

    canvas.addEventListener("mousemove", (e) => {
      const { x, y } = toLocal(e, canvas);
      hovered.i = nearestNodeIndex(x, y);
    });
    canvas.addEventListener("mouseleave", () => { hovered.i = -1; });

    layout();

    const liveColor = cssHsl("--floq-live", "142 76% 36%");   // token fallback
    const soonColor = cssHsl("--floq-soon", "262 83% 58%");   // token fallback
    const timeColor = cssHsl("--floq-edge-time", "215 16% 47%"); // fallback: slate-500-ish
    const friendColor = cssHsl("--floq-edge-friend", "222 84% 56%"); // fallback: brand ring

    const draw = (t: number) => {
      const DPR = Math.max(1, window.devicePixelRatio || 1);
      const w = canvas.width / DPR;
      const h = canvas.height / DPR;

      // reset and set scale each frame (prevents accumulation)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const maxR = Math.min(w, h) * 0.45;
      const cx = w / 2;
      const cy = h / 2;

      const drift = (i: number, amp: number) =>
        reduced ? 0 : Math.sin(t * 0.0006 + i) * amp;

      // map node ids → positions for this frame
      const pos = new Map<string, { x:number; y:number }>();
      {
        const capped = nodes.slice(0, 60);
        for (let i = 0; i < capped.length; i++) {
          const n = capped[i];
          const rho = 60 + (1 - n.score) * maxR;
          const theta = ((i * 137.508) % 360) * (Math.PI / 180);
          const x = cx + rho * Math.cos(theta) + drift(i, 1.2);
          const y = cy + rho * Math.sin(theta) + drift(i + 7, 1.2);
          pos.set(n.id, { x, y });
        }
      }

      // edges (cap ≤120 already in hook)
      for (let k = 0; k < edges.length; k++) {
        const e = edges[k];
        const a = pos.get(e.a), b = pos.get(e.b);
        if (!a || !b) continue;

        // hover emphasis
        const hi = hovered.i;
        let alpha = 0.18 * e.w;
        let width = Math.max(1, 2 * e.w);
        if (hi >= 0) {
          // check if this edge touches hovered node index
          const hoveredId = nodes.slice(0, 60)[hi]?.id;
          if (hoveredId && (e.a === hoveredId || e.b === hoveredId)) {
            alpha = Math.min(0.8, 0.3 + 0.5 * e.w);
            width = Math.max(1.5, 3 * e.w);
          } else {
            alpha *= 0.5; // fade others
          }
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = e.kind === "friend" ? friendColor : timeColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Nodes (cap to 60 for perf)
      const capped = nodes.slice(0, 60);
      for (let i = 0; i < capped.length; i++) {
        const n = capped[i];
        const rho = 60 + (1 - n.score) * maxR;
        const theta = ((i * 137.508) % 360) * (Math.PI / 180);
        const x = cx + rho * Math.cos(theta) + drift(i, 1.2);
        const y = cy + rho * Math.sin(theta) + drift(i + 7, 1.2);
        const r = 8 + Math.min(24, Math.log2(1 + (n.participants || 0)) * 4);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.status === "live" ? liveColor : soonColor;
        ctx.globalAlpha = 0.9;
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [nodes, edges, reduced]);

  return <canvas ref={ref} className="h-full w-full" aria-label="Constellation canvas" />;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(!!q.matches);
    onChange();
    q.addEventListener?.("change", onChange);
    return () => q.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}