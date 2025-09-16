import * as React from "react";
import { MomentaryMetricGrid, MomentaryMetricItem } from "../cards/MomentaryMetricGrid";

export function ActiveMomentaryRail({ items }: { items: MomentaryMetricItem[] }) {
  return (
    <div className="mt-3 flex flex-col gap-6">
      {items.map((item) => (
        <MomentaryMetricGrid key={item.id} item={item} />
      ))}
    </div>
  );
}