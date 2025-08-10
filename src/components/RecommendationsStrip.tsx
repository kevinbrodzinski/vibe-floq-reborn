import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Clock, Sparkles, X } from "lucide-react";
import { useFloqSuggestions, type FloqSuggestion } from "@/hooks/useFloqSuggestions";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { trackFloqJoin, trackFloqSuggestionDismissed } from "@/lib/analytics";

interface RecommendationsStripProps {
  geo?: { lat: number; lng: number };
  onSelectFloq?: (floq: FloqSuggestion) => void;
  limit?: number;
}

const vibeColors: Record<string, string> = {
  chill: 'hsl(180, 70%, 60%)',
  hype: 'hsl(260, 70%, 65%)',
  romantic: 'hsl(330, 70%, 65%)',
  social: 'hsl(25, 70%, 60%)',
  solo: 'hsl(210, 70%, 65%)',
  weird: 'hsl(280, 70%, 65%)',
  flowing: 'hsl(100, 70%, 60%)',
  down: 'hsl(220, 15%, 55%)',
};

const SuggestionCard = ({ 
  floq, 
  onSelect,
  onDismiss 
}: { 
  floq: FloqSuggestion; 
  onSelect?: (floq: FloqSuggestion) => void;
  onDismiss?: (floqId: string) => void;
}) => {
  const { joinFloq } = useOfflineQueue();
  const vibeColor = vibeColors[floq.primary_vibe] || vibeColors.social;
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await joinFloq.mutateAsync(floq.floq_id);
      
      // Track join event
      trackFloqJoin(floq.floq_id, floq.title, floq.primary_vibe);
    } catch (error) {
      console.error('Failed to join floq:', error);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track dismissal
    trackFloqSuggestionDismissed(floq.floq_id, 'user_dismiss');
    
    // Call parent dismiss handler
    onDismiss?.(floq.floq_id);
  };

  return (
    <div 
      className="flex-shrink-0 w-72 bg-card/40 backdrop-blur-lg rounded-2xl border border-border/30 p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-card/60 relative"
      onClick={() => onSelect?.(floq)}
      role="button"
      tabIndex={0}
      aria-label={`Join ${floq.title} floq, ${floq.primary_vibe} vibe, ${formatDistance(floq.distance_meters)} away`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(floq);
        }
      }}
    >
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
        aria-label="Dismiss suggestion"
      >
        <X size={12} />
      </button>
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: vibeColor + '20',
            boxShadow: `0 0 20px ${vibeColor}30`
          }}
        >
          <Sparkles size={18} style={{ color: vibeColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {floq.title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="capitalize">{floq.primary_vibe}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <MapPin size={10} />
              <span>{formatDistance(floq.distance_meters)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {Math.round(floq.confidence_score * 100)}% match
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users size={10} />
            <span>{floq.participant_count}</span>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-xs h-7"
          onClick={handleJoin}
          disabled={joinFloq.isPending}
          aria-label={`Join ${floq.title}`}
        >
          {joinFloq.isPending ? (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
          ) : null}
          {joinFloq.isPending ? 'Joining...' : 'Join'}
        </Button>
      </div>
    </div>
  );
};

export function RecommendationsStrip({ 
  geo, 
  onSelectFloq, 
  limit = 5 
}: RecommendationsStripProps) {
  const { data: suggestions = [], isLoading } = useFloqSuggestions({ 
    geo, 
    limit,
    enabled: !!geo 
  });

  const handleDismiss = (floqId: string) => {
    // For now, just log. In a real app, you'd want to store dismissed suggestions
    console.log('Dismissed suggestion:', floqId);
  };

  if (!geo || isLoading || !Array.isArray(suggestions) || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Recommended for you
        </h2>
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-2">
          {Array.isArray(suggestions) && suggestions.map((floq) => (
            <SuggestionCard
              key={floq.floq_id}
              floq={floq}
              onSelect={onSelectFloq}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}