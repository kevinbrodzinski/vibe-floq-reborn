import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export type Stop = { id: string; name: string; eta?: string | null };
export default function UpcomingStopsCarousel({ stops }: { stops: Stop[] }) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-3 p-2">
        {stops.map((s) => (
          <Card key={s.id} className="min-w-[180px] shrink-0">
            <CardContent className="p-3 space-y-1">
              <h4 className="font-bold">{s.name}</h4>
              {s.eta && <p className="text-sm text-muted-foreground">ETA {s.eta}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}