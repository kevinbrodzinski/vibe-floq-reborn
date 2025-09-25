import * as React from "react";
import { UnifiedFloqCard, UnifiedFloqItem } from "../cards/UnifiedFloqCard";

export function TribesRail({ items }: { items: UnifiedFloqItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
      {items.map((item) => (
        <div key={item.id} className="relative group">
          {/* Health indicator overlay */}
          <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs font-medium bg-background/80 backdrop-blur-sm border border-border/30">
            {Math.random() > 0.6 ? (
              <span className="text-red-400">Decay↓</span>
            ) : (
              <span className="text-green-400">Healthy</span>
            )}
          </div>
          <UnifiedFloqCard item={item} />
        </div>
      ))}
    </div>
  );
}