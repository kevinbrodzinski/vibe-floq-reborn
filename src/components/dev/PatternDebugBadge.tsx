import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { useVibeEngine } from '@/hooks/useVibeEngine';

export function PatternDebugBadge() {
  const engine = useVibeEngine();
  
  // Only show in dev mode and when patterns are active
  if (!import.meta.env.DEV || !engine?.patterns?.hasEnoughData) {
    return null;
  }

  const { patterns } = engine;
  
  return (
    <div className="fixed top-4 left-4 z-[600] flex gap-1">
      <Badge variant="outline" className="text-xs bg-black/80 text-white border-white/20">
        {patterns.chronotype} • {patterns.energyType.split('-')[0]} • {patterns.socialType}
      </Badge>
      <Badge variant="outline" className="text-xs bg-black/80 text-white border-white/20">
        {patterns.correctionCount} corrections
      </Badge>
    </div>
  );
}