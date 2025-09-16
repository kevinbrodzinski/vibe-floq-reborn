import * as React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MomentaryFloqCard, MomentaryCardItem } from "../cards/MomentaryFloqCard";

export function MomentaryRail({ items }: { items: MomentaryCardItem[] }) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 px-2 py-3">
        {items.map((it) => (
          <MomentaryFloqCard key={it.id} item={it} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}