import * as React from "react";
import type { VibeKey } from "./useMomentaryFilters";

export type UserVibe = { key: VibeKey; vector: [number, number, number] };

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function norm3([a,b,c]: [number,number,number]): [number,number,number] {
  const s = Math.sqrt(a*a + b*b + c*c) || 1;
  return [a/s, b/s, c/s];
}

export function vibeKeyToVector(key: VibeKey): [number,number,number] {
  // chill = [1,0,0] · social = [0,1,0] · hype = [0,0,1]
  return key === "chill" ? [1,0,0] : key === "social" ? [0,1,0] : [0,0,1];
}

export function useUserVibe(): UserVibe {
  // Strategy: prefer runtime store window.__FLOQ_VIBE__, else localStorage, else default
  const [uv, setUv] = React.useState<UserVibe>(() => {
    if (typeof window !== "undefined" && (window as any).__FLOQ_VIBE__) {
      const k = (window as any).__FLOQ_VIBE__.key as VibeKey | undefined;
      const v = (window as any).__FLOQ_VIBE__.vector as number[] | undefined;
      if (k && v?.length === 3) return { key: k, vector: norm3([v[0], v[1], v[2]] as any) };
    }
    if (typeof window !== "undefined") {
      const k = (localStorage.getItem("floq:userVibeKey") as VibeKey) || "social";
      const v = JSON.parse(localStorage.getItem("floq:userVibeVector") || "null") as number[] | null;
      if (v?.length === 3) return { key: k, vector: norm3([v[0], v[1], v[2]] as any) };
      return { key: k, vector: vibeKeyToVector(k) };
    }
    return { key: "social", vector: [0,1,0] };
  });

  // expose setter for dev/mocks
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const on = (e: any) => {
      const k = e?.detail?.key as VibeKey | undefined;
      const v = e?.detail?.vector as number[] | undefined;
      if (k && v?.length === 3) setUv({ key: k, vector: norm3([v[0], v[1], v[2]] as any) });
    };
    window.addEventListener("floq:user_vibe", on as any);
    return () => window.removeEventListener("floq:user_vibe", on as any);
  }, []);

  return uv;
}