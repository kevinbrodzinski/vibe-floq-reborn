import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type Stop = { id: string; name: string; eta?: string | null };
export function UpcomingStopsCarousel({ stops }: { stops: Stop[] }) {
  return (
    <div className="flex overflow-x-auto gap-3 px-2 pb-1">
      {stops.map((s) => (
        <Card key={s.id} className="min-w-[180px]">
          <CardHeader className="py-2">
            <CardTitle className="text-base">{s.name}</CardTitle>
          </CardHeader>
          {s.eta && (
            <CardContent className="pt-0 text-sm text-muted-foreground">ETA {s.eta}</CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}