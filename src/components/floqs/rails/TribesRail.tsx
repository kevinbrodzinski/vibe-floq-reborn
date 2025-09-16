import * as React from "react";
import { UnifiedFloqCard, UnifiedFloqItem } from "../cards/UnifiedFloqCard";

export function TribesRail({ items }: { items: UnifiedFloqItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 flex flex-col gap-4">
      {items.map((item) => (
        <UnifiedFloqCard key={item.id} item={item} />
      ))}
    </div>
  );
}