import { useEffect, useState } from "react";
import { MapPin, X, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloqSuggestions, type FloqSuggestion } from "@/hooks/useFloqSuggestions";
import { toast } from "@/hooks/use-toast";

interface SuggestionsToastProps {
  geo?: { lat: number; lng: number };
  onJoinFloq?: (floqId: string) => void;
  minimumConfidence?: number;
  cooldownMinutes?: number;
}

export function SuggestionsToast({ 
  geo, 
  onJoinFloq,
  minimumConfidence = 0.7,
  cooldownMinutes = 15 
}: SuggestionsToastProps) {
  const [dismissedFloqs, setDismissedFloqs] = useState<Set<string>>(new Set());
  const [lastShownTime, setLastShownTime] = useState<number>(0);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const dismissedData = localStorage.getItem('suggestions_dismissed_floqs');
      const lastShownData = localStorage.getItem('suggestions_last_shown_time');
      
      if (dismissedData) {
        setDismissedFloqs(new Set(JSON.parse(dismissedData)));
      }
      if (lastShownData) {
        setLastShownTime(parseInt(lastShownData, 10));
      }
    } catch (error) {
      console.warn('Failed to load suggestions persistence data:', error);
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('suggestions_dismissed_floqs', JSON.stringify(Array.from(dismissedFloqs)));
  }, [dismissedFloqs]);

  useEffect(() => {
    if (lastShownTime > 0) {
      localStorage.setItem('suggestions_last_shown_time', lastShownTime.toString());
    }
  }, [lastShownTime]);
  
  const { data: suggestions = [] } = useFloqSuggestions({ 
    geo, 
    limit: 3,
    enabled: !!geo 
  });

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  useEffect(() => {
    if (!suggestions.length) return;

    const now = Date.now();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    
    // Check cooldown
    if (now - lastShownTime < cooldownMs) return;

    // Find high-confidence suggestion that hasn't been dismissed
    const highConfidenceSuggestion = suggestions.find(
      s => s.confidence_score >= minimumConfidence && 
           !dismissedFloqs.has(s.floq_id)
    );

    if (!highConfidenceSuggestion) return;

    // Show toast notification
    const { dismiss } = toast({
      title: "Floq suggestion",
      description: (
        <div className="space-y-2">
          <p className="font-medium">{highConfidenceSuggestion.title}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>{formatDistance(highConfidenceSuggestion.distance_meters)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{highConfidenceSuggestion.participant_count} joined</span>
            </div>
            <span className="capitalize">{highConfidenceSuggestion.primary_vibe}</span>
          </div>
        </div>
      ),
      action: (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              // Analytics tracking
              if (typeof window !== 'undefined' && (window as any).posthog) {
                (window as any).posthog.capture('floq_join_from_suggestion', {
                  floq_id: highConfidenceSuggestion.floq_id,
                  confidence_score: highConfidenceSuggestion.confidence_score,
                  distance_meters: highConfidenceSuggestion.distance_meters,
                  source: 'smart_notification'
                });
              }
              
              onJoinFloq?.(highConfidenceSuggestion.floq_id);
              dismiss();
            }}
            className="text-xs"
            aria-label={`Join ${highConfidenceSuggestion.title} floq`}
          >
            Join
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              // Analytics tracking
              if (typeof window !== 'undefined' && (window as any).posthog) {
                (window as any).posthog.capture('floq_suggestion_dismissed', {
                  floq_id: highConfidenceSuggestion.floq_id,
                  confidence_score: highConfidenceSuggestion.confidence_score,
                  source: 'smart_notification'
                });
              }
              
              setDismissedFloqs(prev => new Set([...prev, highConfidenceSuggestion.floq_id]));
              dismiss();
            }}
            className="text-xs"
            aria-label="Dismiss suggestion"
          >
            <X size={12} />
          </Button>
        </div>
      ),
      duration: 8000, // 8 seconds
    });

    setLastShownTime(now);
  }, [suggestions, dismissedFloqs, lastShownTime, minimumConfidence, cooldownMinutes, onJoinFloq]);

  return null; // This component only shows toasts, no render
}