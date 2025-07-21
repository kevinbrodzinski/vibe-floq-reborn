
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, MapPin, Users } from 'lucide-react';
import type { PlanStopUi } from '@/types/plan';

interface PlanSummaryStatsProps {
  stops: PlanStopUi[];
  participantCount: number;
  maxParticipants?: number;
}

export function PlanSummaryStats({ 
  stops, 
  participantCount, 
  maxParticipants 
}: PlanSummaryStatsProps) {
  const totalDuration = stops.reduce((acc, stop) => {
    return acc + (stop.duration_minutes || 0);
  }, 0);

  const totalCost = stops.reduce((acc, stop) => {
    return acc + (stop.estimated_cost_per_person || 0);
  }, 0);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(amount);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const completionRate = stops.length > 0 
    ? Math.round((stops.filter(s => s.venue?.id).length / stops.length) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Duration */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">
              {formatDuration(totalDuration)}
            </div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
        </div>
      </Card>

      {/* Cost */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">
              {totalCost > 0 ? formatCurrency(totalCost) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Per person</div>
          </div>
        </div>
      </Card>

      {/* Stops */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">
              {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
            </div>
            <div className="text-xs text-muted-foreground">
              <Badge 
                variant={completionRate === 100 ? 'default' : 'secondary'}
                className="text-xs px-1 py-0"
              >
                {completionRate}% ready
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Participants */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">
              {participantCount}
              {maxParticipants && `/${maxParticipants}`}
            </div>
            <div className="text-xs text-muted-foreground">Going</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
