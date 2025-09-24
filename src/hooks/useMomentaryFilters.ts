import * as React from "react";

export type VibeKey = "chill" | "social" | "hype";
export type SmartKey = "matchVibe" | "lowFriction" | "buildingEnergy";

export type MomentaryFilters = {
  vibes: VibeKey[];
  endsSoon: boolean;         // end ≤ 30m
  smart: SmartKey[];         // optional: smart filters
};

const DEFAULTS: MomentaryFilters = { vibes: [], endsSoon: false, smart: [] };

function readFromURL(): MomentaryFilters {
  if (typeof window === "undefined") return DEFAULTS;
  const u = new URL(window.location.href);
  const vibes = u.searchParams.get("vibes");
  const es = u.searchParams.get("endsSoon");
  const smart = u.searchParams.get("smart");
  return {
    vibes: vibes ? (vibes.split(",").filter(Boolean) as VibeKey[]) : [],
    endsSoon: es === "1" || es === "true",
    smart: smart ? (smart.split(",").filter(Boolean) as SmartKey[]) : [],
  };
}
function writeToURL(f: MomentaryFilters) {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  f.vibes.length ? u.searchParams.set("vibes", f.vibes.join(",")) : u.searchParams.delete("vibes");
  f.endsSoon ? u.searchParams.set("endsSoon", "1") : u.searchParams.delete("endsSoon");
  f.smart.length ? u.searchParams.set("smart", f.smart.join(",")) : u.searchParams.delete("smart");
  window.history.replaceState({}, "", u.toString());
}

export function useMomentaryFilters() {
  const [filters, setFilters] = React.useState<MomentaryFilters>(() => readFromURL());
  React.useEffect(() => { writeToURL(filters); }, [filters]);

  const toggleVibe = (k: VibeKey) =>
    setFilters((f) => ({ ...f, vibes: f.vibes.includes(k) ? f.vibes.filter(x => x !== k) : [...f.vibes, k] }));

  const toggleSmart = (k: SmartKey) =>
    setFilters((f) => ({ ...f, smart: f.smart.includes(k) ? f.smart.filter(x => x !== k) : [...f.smart, k] }));

  const setEndsSoon = (v: boolean) => setFilters((f) => ({ ...f, endsSoon: v }));

  return { filters, toggleVibe, toggleSmart, setEndsSoon };
}