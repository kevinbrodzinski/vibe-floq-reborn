import * as React from "react";
import { FloqCardLarge, FloqLargeItem } from "@/components/floqs/cards/FloqCardLarge";
import { FloqCarousel } from "./FloqCarousel";

export type MomentaryCardItem = FloqLargeItem; // reuse shape

export function MomentaryRail({ items }: { items: MomentaryCardItem[] }) {
  if (!items?.length) return null;
  return (
    <FloqCarousel>
      {items.map((it) => <FloqCardLarge key={it.id} item={it} />)}
    </FloqCarousel>
  );
}