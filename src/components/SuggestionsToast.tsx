import { useEffect, useState } from "react";
import { MapPin, X, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloqSuggestions, type FloqSuggestion } from "@/hooks/useFloqSuggestions";
import { toast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/hooks/useLocalStorage';

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
  const [dismissedFloqs, setDismissedFloqs] = useLocalStorage<string[]>('suggestions_dismissed_floqs', []);
  const [lastShownTime, setLastShownTime] = useLocalStorage<number>('suggestions_last_shown_time', 0);

  
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
    if (!Array.isArray(suggestions) || suggestions.length === 0) return;

    const now = Date.now();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    
    // Check cooldown
    if (now - lastShownTime < cooldownMs) return;

    // Find high-confidence suggestion that hasn't been dismissed
    const highConfidenceSuggestion = Array.isArray(suggestions) ? suggestions.find(
      s => s.confidence_score >= minimumConfidence && 
           !dismissedFloqs.includes(s.floq_id)
    ) : undefined;

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
              // Analytics tracking with throttling in dev
              if (typeof window !== 'undefined' && (window as any).posthog) {
                const posthog = (window as any).posthog;
                const safeCapture = import.meta.env.DEV
                  ? (() => {
                      let lastCall = 0;
                      return (event: string, props: any) => {
                        const now = Date.now();
                        if (now - lastCall > 2000) {
                          lastCall = now;
                          posthog.capture(event, props);
                        }
                      };
                    })()
                  : posthog.capture.bind(posthog);
                
                safeCapture('floq_join_from_suggestion', {
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
              // Analytics tracking with throttling in dev
              if (typeof window !== 'undefined' && (window as any).posthog) {
                const posthog = (window as any).posthog;
                const safeCapture = import.meta.env.DEV
                  ? (() => {
                      let lastCall = 0;
                      return (event: string, props: any) => {
                        const now = Date.now();
                        if (now - lastCall > 2000) {
                          lastCall = now;
                          posthog.capture(event, props);
                        }
                      };
                    })()
                  : posthog.capture.bind(posthog);
                
                safeCapture('floq_suggestion_dismissed', {
                  floq_id: highConfidenceSuggestion.floq_id,
                  confidence_score: highConfidenceSuggestion.confidence_score,
                  source: 'smart_notification'
                });
              }
              
              setDismissedFloqs(prev => [...prev, highConfidenceSuggestion.floq_id]);
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