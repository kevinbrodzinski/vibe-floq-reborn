import * as React from "react";
import { UnifiedFloqCard, UnifiedFloqItem } from "@/components/floqs/cards/UnifiedFloqCard";
import { FloqCarousel } from "./FloqCarousel";

export type MomentaryCardItem = UnifiedFloqItem;

export function MomentaryRail({ items }: { items: MomentaryCardItem[] }) {
  if (!items?.length) return null;
  return (
    <FloqCarousel>
      {items.map((it) => <UnifiedFloqCard key={it.id} item={it} />)}
    </FloqCarousel>
  );
}