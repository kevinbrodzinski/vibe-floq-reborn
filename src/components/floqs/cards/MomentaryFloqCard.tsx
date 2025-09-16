import * as React from "react";
import { differenceInMinutes } from "date-fns";
import { FloqCard, FloqCardItem } from "./FloqCard";

export type MomentaryCardItem = FloqCardItem & {
  starts_at: string; // ISO
  ends_at: string;   // ISO
};

export function MomentaryFloqCard({ item }: { item: MomentaryCardItem }) {
  // TTL arc can be layered as SVG later; for now we reuse the base card
  const ttl = React.useMemo(() => {
    try {
      return Math.max(0, differenceInMinutes(new Date(item.ends_at), new Date()));
    } catch { return 0; }
  }, [item.ends_at]);

  return <FloqCard item={item} kind="momentary" />;
}