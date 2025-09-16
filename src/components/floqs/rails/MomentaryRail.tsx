import * as React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MomentaryFloqCard, MomentaryCardItem } from "../cards/MomentaryFloqCard";

export function MomentaryRail({ items }: { items: MomentaryCardItem[] }) {
  return (
    <div className="mt-3 flex flex-col gap-3 px-2">
      {items.map((it) => (
        <MomentaryFloqCard key={it.id} item={it} />
      ))}
    </div>
  );
}