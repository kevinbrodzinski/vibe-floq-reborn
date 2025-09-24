import React from 'react';
import { GlassCard } from '@/components/profile/GlassCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSharedActivitySuggestions } from '@/hooks/useSharedActivitySuggestions';
import { useFloqUI } from '@/contexts/FloqUIContext';
import type { SharedActivityContext } from '@/lib/intelligence';

interface Props extends SharedActivityContext { 
  isMe: boolean;
  onPlanIt?: (suggestion: { title: string; venue_id?: string; vibe?: string }) => void;
}

export const IdeasForYouTwo: React.FC<Props> = (ctx) => {
  const { isMe, onPlanIt, ...promptCtx } = ctx;
  const { data, isFetching } = useSharedActivitySuggestions(promptCtx, { enabled: !isMe });
  const { setShowCreateSheet } = useFloqUI();

  const fallback = [
    {
      emoji: '☕',
      title: `Coffee at ${ctx.topCommonVenues[0]?.name ?? 'a favorite café'}`,
      body: 'Low-key catch-up aligned with your shared chill vibe.',
      venue_id: undefined,
      vibe: undefined,
    },
    {
      emoji: '🎵',
      title: 'Live-music night',
      body: 'You both love music venues – check local open-mic listings.',
      venue_id: undefined,
      vibe: undefined,
    },
  ];

  const suggestions = data?.length ? data : fallback;

  const handlePlanIt = (suggestion: typeof suggestions[0]) => {
    if (onPlanIt) {
      onPlanIt({
        title: suggestion.title,
        venue_id: suggestion.venue_id,
        vibe: suggestion.vibe,
      });
    } else {
      // Fallback: just open the Create Floq sheet
      setShowCreateSheet(true);
    }
  };

  if (isMe) return null;

  return (
    <GlassCard className="space-y-3">
      <h3 className="text-sm font-medium text-white">Ideas for You Two</h3>

      {isFetching && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full bg-white/10" />
          <Skeleton className="h-16 w-full bg-white/10" />
          <Skeleton className="h-16 w-full bg-white/10" />
        </div>
      )}

      {!isFetching &&
        suggestions.map((s, index) => (
          <div key={s.title + index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <span className="text-xl flex-shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm mb-1">{s.title}</div>
              <div className="text-xs text-gray-300 leading-relaxed">{s.body}</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handlePlanIt(s)}
              className="flex-shrink-0 text-xs px-3 py-1 h-auto bg-primary/20 hover:bg-primary/30 text-primary-foreground border-0"
            >
              Plan it
            </Button>
          </div>
        ))}
    </GlassCard>
  );
};