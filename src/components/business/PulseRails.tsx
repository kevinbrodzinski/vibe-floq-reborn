import * as React from "react";
import { usePulseData } from "@/hooks/usePulseData";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BusinessQuickCard } from "./BusinessQuickCard";

export function PulseRails() {
  const pulse = usePulseData();
  return (
    <div className="space-y-6 px-2">
      <Rail title="Happening Now" items={pulse.now} />
      <Rail title="Starting Soon" items={pulse.startingSoon} />
      <Rail title="Perfect Timing" items={pulse.perfectTiming} />
      <Rail title="Your Follows" items={pulse.follows} />
    </div>
  );
}

function Rail({ title, items }: { title: string; items: any[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="text-lg font-semibold">{title}</h3>
      <ScrollArea className="w-full">
        <div className="flex gap-3 py-3">
          {items.map((it) => <BusinessQuickCard key={it.id} item={it} />)}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}