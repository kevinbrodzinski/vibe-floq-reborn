import * as React from "react";
import { differenceInMinutes } from "date-fns";
import { FloqCard, FloqCardItem } from "./FloqCard";
import { TTLArc } from "../visual/TTLArc";
import { CohesionRing } from "../visual/CohesionRing";
import { MemberParticles } from "../visual/MemberParticles";
import { RippleIndicator } from "../visual/RippleIndicator";

export type MomentaryCardItem = FloqCardItem & {
  starts_at: string;
  ends_at: string;
  cohesion?: number; // 0..1 (optional, fallback used)
};

export function MomentaryFloqCard({ item }: { item: MomentaryCardItem }) {
  const ttlMin = React.useMemo(() => {
    try { return Math.max(0, differenceInMinutes(new Date(item.ends_at), new Date())); }
    catch { return 0; }
  }, [item.ends_at]);

  const cohesion = typeof item.cohesion === "number" ? item.cohesion : 0.6;

  return (
    <div className="relative">
      {/* Optional ripple near avatars to hint "activity" */}
      <RippleIndicator active={item.status === "live"} className="absolute left-1 top-1 z-10" size={36} />

      {/* Ambient member particles under the donut (right side) */}
      <MemberParticles live={item.status === "live"} className="absolute right-1 top-1 z-10" size={40} />

      {/* Main card layout */}
      <FloqCard item={item} kind="momentary" />
      
      {/* TTL arc + cohesion ring */}
      <CohesionRing cohesion={cohesion} />
      <TTLArc startsAt={item.starts_at} endsAt={item.ends_at} />
      
      {/* TTL label */}
      <div className="absolute right-3 top-[58px] rounded bg-background/70 px-1.5 py-0.5 text-[11px] text-muted-foreground z-10">
        {ttlMin > 0 ? `${ttlMin}m` : "<1m"}
      </div>
    </div>
  );
}