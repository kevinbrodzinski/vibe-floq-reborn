import React from 'react';
import { AdvancedFloqCard } from '../gestures/AdvancedFloqCard';
import { RealtimeAnimations, LiveMemberCount, LiveEnergyLevel } from '../animations/RealtimeAnimations';
import { useFloqScores } from '@/hooks/useFloqScores';
import { FloqCardItem } from '../cards/FloqCard';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EnhancedFloqCardProps {
  item: FloqCardItem;
  kind: "tribe" | "discover" | "public" | "momentary";
  onSave?: () => void;
  onJoin?: () => void;
  className?: string;
}

export function EnhancedFloqCard({ 
  item, 
  kind, 
  onSave, 
  onJoin,
  className 
}: EnhancedFloqCardProps) {
  const { compatibilityPct, friction, energyNow } = useFloqScores(item);
  const frictionLabel = friction < 0.25 ? "Low" : friction < 0.6 ? "Moderate" : "High";
  
  const displayName = item.name || item.title || "Untitled";
  const participantCount = item.participants ?? item.participant_count ?? 0;

  return (
    <AdvancedFloqCard
      item={item}
      onSave={onSave}
      onJoin={onJoin}
      className={className}
    >
      <Card className="w-full border-0 bg-transparent shadow-none">
        <CardHeader className="pb-2 relative">
          <RealtimeAnimations floqId={item.id} />
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="truncate">{displayName}</CardTitle>
            <Badge variant={item.status === "live" ? "default" : "secondary"}>
              {item.status === "live" ? "Live" : item.status === "upcoming" ? "Soon" : "Ended"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Compatibility {Math.round(compatibilityPct)}%</p>
          <p>Friction {frictionLabel}</p>
          <div className="flex items-center gap-2">
            <span>Energy</span>
            <LiveEnergyLevel floqId={item.id} currentEnergy={energyNow} />
          </div>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-1">
            <LiveMemberCount floqId={item.id} currentCount={participantCount} />
            <span>in</span>
          </div>
          {item.friends_in ? (
            <span>{item.friends_in} friends</span>
          ) : (
            <span />
          )}
        </CardFooter>
      </Card>
    </AdvancedFloqCard>
  );
}