import * as React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { FloqCard, FloqCardItem } from "../cards/FloqCard";

export function DiscoverRail({ items }: { items: FloqCardItem[] }) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 px-2 py-3">
        {items.map((it) => (
          <FloqCard key={it.id} item={it} kind="discover" />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}