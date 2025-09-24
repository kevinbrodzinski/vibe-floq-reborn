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
    <div
      onClick={onToggle}
      className={`rounded-xl p-4 flex flex-col cursor-pointer transition-all duration-200 relative
        ${selected ? 'ring-2 ring-primary/80 bg-primary/10' : 'hover:bg-muted/20 border border-border/30'}
      `}
    >
      {/* Floq Name */}
      <span className="font-medium truncate">{displayName}</span>
      
      {/* Member Count */}
      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
        <Users className="w-3 h-3" /> 
        {floq.member_count || 0} member{(floq.member_count || 0) !== 1 ? 's' : ''}
      </span>
      
      {/* Vibe Badge */}
      {floq.primary_vibe && (
        <div className="mt-auto self-start">
          <VibePill className="mt-auto self-start" vibe={floq.primary_vibe as any} />
        </div>
      )}

      {/* Selected Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}