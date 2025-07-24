import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Check } from 'lucide-react';
import { VibePill } from '@/components/floq/VibePill';
import type { ActiveFloq } from '@/hooks/useMyActiveFloqs';

interface FloqCardMiniProps {
  floq: ActiveFloq;
  selected: boolean;
  onToggle: () => void;
}

export function FloqCardMini({ floq, selected, onToggle }: FloqCardMiniProps) {
  const displayName = floq.title || floq.name || 'Untitled Floq';
  
  return (
    <Card
      onClick={onToggle}
      className={`relative p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
        selected 
          ? 'ring-2 ring-primary bg-primary/5 border-primary' 
          : 'hover:border-primary/50'
      }`}
    >
      {/* Floq Name */}
      <div className="font-medium text-sm mb-2 line-clamp-2">
        {displayName}
      </div>

      {/* Member Count */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <Users className="w-3 h-3" />
        <span>{floq.member_count || 0} member{(floq.member_count || 0) !== 1 ? 's' : ''}</span>
      </div>

      {/* Vibe Badge */}
      {floq.primary_vibe && (
        <div className="pointer-events-none">
          <VibePill vibe={floq.primary_vibe as any} />
        </div>
      )}

      {/* Selected Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-3 h-3" />
        </div>
      )}
    </Card>
  );
}