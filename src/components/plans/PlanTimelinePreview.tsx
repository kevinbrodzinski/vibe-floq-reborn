
import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, DollarSign, Users, Navigation } from 'lucide-react';
import { formatCurrency, formatTime } from '@/lib/format';
import type { PlanStopUi } from '@/types/plan';

interface PlanTimelinePreviewProps {
  stops: PlanStopUi[];
  isLoading?: boolean;
}

export function PlanTimelinePreview({ stops, isLoading }: PlanTimelinePreviewProps) {
  const { totalCost, totalDuration } = useMemo(() => {
    return stops.reduce(
      (acc, stop) => ({
        totalCost: acc.totalCost + (stop.estimated_cost_per_person || 0),
        totalDuration: acc.totalDuration + (stop.duration_minutes || 0)
      }),
      { totalCost: 0, totalDuration: 0 }
    );
  }, [stops]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (stops.length === 0) {
    return (
      <Card className="p-6 text-center">
        <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-medium mb-1">No stops planned yet</h3>
        <p className="text-sm text-muted-foreground">
          Add stops to create your timeline
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {stops.map((stop, index) => (
          <React.Fragment key={stop.id}>
            <div className="relative">
            {/* Timeline connector */}
            {index > 0 && (
              <div className="absolute left-2 -top-4 w-0.5 h-4 bg-border" />
            )}
            
            <div className="flex gap-3">
              {/* Timeline dot */}
              <div className="relative flex-shrink-0">
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                </div>
              </div>

              {/* Stop content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm leading-tight truncate">
                      {stop.title}
                    </h4>
                    {stop.venue?.name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {stop.venue.name}
                      </p>
                    )}
                  </div>
                  
                   <div className="flex-shrink-0 text-right">
                     <div className="text-xs font-medium">
                       {formatTime(stop.start_time || '')}
                     </div>
                    {stop.duration_minutes && (
                      <div className="text-xs text-muted-foreground">
                        {stop.duration_minutes} min
                      </div>
                    )}
                  </div>
                </div>

                {/* Stop details */}
                <div className="flex items-center gap-4 mt-2">
                   {stop.estimated_cost_per_person && (
                     <div className="flex items-center gap-1 text-xs text-muted-foreground">
                       <DollarSign className="w-3 h-3" />
                       {formatCurrency(stop.estimated_cost_per_person)}
                     </div>
                   )}
                  
                  {stop.venue?.address && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <Navigation className="w-3 h-3" />
                      <span className="truncate">{stop.venue.address}</span>
                    </div>
                  )}
                </div>

                {stop.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {stop.description}
                  </p>
                )}
              </div>
            </div>

             {/* Transit time to next stop */}
             {index < stops.length - 1 && (
               <div className="flex items-center gap-2 mt-3 ml-7 text-xs text-muted-foreground">
                 <Navigation className="w-3 h-3" />
                 <span>~5 min</span>
               </div>
             )}
             </div>
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}
