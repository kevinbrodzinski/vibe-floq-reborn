import * as React from "react";
import { useFloqsHubData } from "@/hooks/useFloqsHubData";

export function usePulseData() {
  const hub = useFloqsHubData();
  const now = Date.now();
  const soon = now + 2 * 60 * 60 * 1000;

  const isLive = (f: any) => f.starts_at && f.ends_at && Date.now() >= +new Date(f.starts_at) && Date.now() <= +new Date(f.ends_at);
  const startingSoon = (f: any) => f.starts_at && +new Date(f.starts_at) > now && +new Date(f.starts_at) <= soon;

  const perfectTiming = (f: any) => {
    const energyNow = f.energy_now ?? 0.5;
    const peak = Math.max(energyNow, f.energy_peak ?? 0.6);
    const peakRatio = peak > 0 ? energyNow / peak : 0.0;
    const eta = (f.eta_minutes ?? 0);
    // high energy relative to peak, eta reasonable
    return energyNow >= 0.6 && peakRatio >= 0.8 && eta <= 20;
  };

  // Follows: derive from friend presence as a stand-in
  const follows = (f: any) => (f.is_followed === true) || (f.friends_in ?? 0) >= 1;

  const candidates = React.useMemo(() => {
    // reuse publicFloqs + discover as venue/business-like surface
    return [...hub.publicFloqs, ...hub.discover];
  }, [hub.publicFloqs, hub.discover]);

  return {
    now: candidates.filter(isLive).slice(0, 12),
    startingSoon: candidates.filter(startingSoon).slice(0, 12),
    perfectTiming: candidates.filter(perfectTiming).slice(0, 12),
    follows: candidates.filter(follows).slice(0, 12),
  };
}