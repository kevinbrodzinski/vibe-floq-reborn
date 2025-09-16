import * as React from "react";

type Node = {
  id: string;
  name: string;
  status: "live" | "upcoming";
  participants: number;
  friends_in?: number;
  score: number; // 0..1 relevance (center = 1)
};

// Lightweight HTML Canvas implementation (no extra deps).
export function ConstellationCanvas({ nodes }: { nodes: Node[] }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let anim = 0;
    let raf = 0;

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.floor(clientWidth * DPR);
      canvas.height = Math.floor(clientHeight * DPR);
      ctx.scale(DPR, DPR);
    };
    const onResize = () => {
      // reset transform before scaling
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resize();
    };
    resize();
    window.addEventListener("resize", onResize);

    const draw = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // Precompute positions
      const maxR = Math.min(w, h) * 0.45;
      const cx = w / 2;
      const cy = h / 2;

      // Basic jitter for life
      const drift = (i: number, amp: number) => (!reducedMotion ? Math.sin((t * 0.0006) + i) * amp : 0);

      // Edges: friend overlap/time proximity are app-layer; we just render nodes now (edges later)
      // Nodes
      nodes.slice(0, 60).forEach((n, i) => {
        const rho = 60 + (1 - n.score) * maxR;
        const theta = ((i * 137.508) % 360) * (Math.PI / 180);
        const x = cx + rho * Math.cos(theta) + drift(i, 1.5);
        const y = cy + rho * Math.sin(theta) + drift(i + 7, 1.5);
        const r = 8 + Math.min(24, Math.log2(1 + (n.participants || 0)) * 4);

        // node
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        
        // Use CSS variables with fallbacks
        const style = getComputedStyle(document.documentElement);
        const greenVar = style.getPropertyValue("--green-500").trim();
        const violetVar = style.getPropertyValue("--violet-500").trim();
        
        if (greenVar && violetVar) {
          ctx.fillStyle = n.status === "live" ? `hsl(${greenVar})` : `hsl(${violetVar})`;
        } else {
          // Fallbacks using theme colors
          ctx.fillStyle = n.status === "live" ? "#22c55e" : "#8b5cf6";
        }
        
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      anim = 0;
    };
  }, [nodes, reducedMotion]);

  return <canvas ref={ref} className="h-full w-full text-foreground" aria-label="Constellation canvas" />;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(!!q.matches);
    onChange();
    q.addEventListener?.("change", onChange);
    return () => q.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}