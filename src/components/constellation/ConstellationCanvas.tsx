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

export function ConstellationCanvas({ nodes }: { nodes: Node[] }) {
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

    function layout() {
      // account for DPR properly
      const DPR = Math.max(1, window.devicePixelRatio || 1);
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.max(1, Math.floor(w * DPR));
      canvas.height = Math.max(1, Math.floor(h * DPR));
      // draw uses device pixels; we'll set a transform each frame
    }

    layout();

    const liveColor = cssHsl("--floq-live", "142 76% 36%");   // token fallback
    const soonColor = cssHsl("--floq-soon", "262 83% 58%");   // token fallback

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
  }, [nodes, reduced]);

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