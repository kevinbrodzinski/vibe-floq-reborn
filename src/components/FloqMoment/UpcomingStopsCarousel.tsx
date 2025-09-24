import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export type Stop = { id: string; name: string; eta?: string | null };

export default function UpcomingStopsCarousel({ stops }: { stops: Stop[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-2">
      {stops.map((stop) => (
        <Card key={stop.id} className="min-w-[180px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="space-y-1">
              <h4 className="font-bold text-sm">{stop.name}</h4>
              {stop.eta && (
                <p className="text-xs text-muted-foreground">ETA {stop.eta}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}