import * as React from "react";
import { UnifiedFloqCard, UnifiedFloqItem } from "../cards/UnifiedFloqCard";
import { FloqCarousel } from "./FloqCarousel";

export function ActiveMomentaryRail({ items }: { items: UnifiedFloqItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <FloqCarousel>
        {items.map((item) => <UnifiedFloqCard key={item.id} item={item} />)}
      </FloqCarousel>
    </div>
  );
}