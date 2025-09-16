import * as React from "react";
import { differenceInMinutes } from "date-fns";
import { FloqCard, FloqCardItem } from "./FloqCard";
import { TTLArc } from "../visual/TTLArc";
import { CohesionRing } from "../visual/CohesionRing";

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
      <FloqCard item={item} kind="momentary" />
      <CohesionRing cohesion={cohesion} />
      <TTLArc startsAt={item.starts_at} endsAt={item.ends_at} />
      {/* Optional small TTL label */}
      <div className="absolute right-3 top-[58px] rounded bg-background/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
        {ttlMin}m
      </div>
    </div>
  );
}