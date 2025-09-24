import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Compass, MapPin, Clock, Thermometer, Sparkles } from 'lucide-react';
import { intelligenceIntegration } from '@/lib/intelligence/IntelligenceIntegration';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { useVibe } from '@/lib/store/useVibe';
import { vibeToHex } from '@/lib/vibe/color';
import { getVibeLabel } from '@/lib/vibeConstants';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Vibe } from '@/lib/vibes';

interface ContextualVibeRecommendationsProps {
  className?: string;
  location?: { lat: number; lng: number };
  weather?: any;
  compact?: boolean;
}

/**
 * Contextual vibe recommendations based on current situation and learned patterns
 */
export function ContextualVibeRecommendations({ 
  className, 
  location, 
  weather, 
  compact = false 
}: ContextualVibeRecommendationsProps) {
  const insights = usePersonalityInsights();
  const { setVibe } = useVibe();
  const [suggestions, setSuggestions] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadSuggestions() {
      if (!insights.hasEnoughData) {
        setLoading(false);
        return;
      }

      try {
        const context = {
          location,
          time: new Date(),
          weather,
          recentVibes: [] // Could get from recent vibe history
        };

        const contextualSuggestions = await intelligenceIntegration.getContextualSuggestions(context);
        setSuggestions(contextualSuggestions);
      } catch (error) {
        console.error('Failed to load contextual suggestions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSuggestions();
  }, [insights.hasEnoughData, location, weather]);

  if (!insights.hasEnoughData) {
    return null; // Don't show until intelligence is ready
  }

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-4">
          <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
          <div className="h-3 bg-secondary rounded w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || !suggestions.vibePredictions?.length) {
    return null;
  }

  const topPredictions = suggestions.vibePredictions.slice(0, compact ? 2 : 3);

  const handleVibeSelect = (vibe: Vibe) => {
    setVibe(vibe);
    // Could track selection for learning
  };

  const getContextIcon = () => {
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) return <Clock className="h-3 w-3" />;
    if (weather?.condition?.includes('rain')) return <Thermometer className="h-3 w-3" />;
    if (location) return <MapPin className="h-3 w-3" />;
    return <Compass className="h-3 w-3" />;
  };

  const getContextDescription = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    let context = `Perfect for ${timeOfDay}`;
    if (weather?.condition) {
      context += ` • ${weather.condition}`;
    }
    if (location) {
      context += ` • your location`;
    }
    
    return context;
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        <div className="flex items-center gap-2 mb-2">
          {getContextIcon()}
          <span className="text-xs text-muted-foreground">Suggested for you</span>
          <Sparkles className="h-3 w-3 text-primary" />
        </div>
        <div className="flex gap-2">
          {topPredictions.map((prediction: any, index: number) => {
            const vibe = prediction.vibe as Vibe;
            const color = vibeToHex(vibe);
            return (
              <Button
                key={vibe}
                variant="outline"
                size="sm"
                className={cn(
                  "flex-1 text-xs h-8 border-2 transition-all hover:scale-105",
                  `border-[${color}] hover:bg-[${color}]/10`
                )}
                style={{
                  borderColor: color,
                  color: color
                }}
                onClick={() => handleVibeSelect(vibe)}
              >
                {getVibeLabel(vibe)}
              </Button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <Card className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Compass className="h-4 w-4" />
          AI Vibe Recommendations
          <Badge variant="outline" className="text-xs">
            {Math.round(suggestions.confidence * 100)}% confidence
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {getContextDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {topPredictions.map((prediction: any, index: number) => {
            const vibe = prediction.vibe as Vibe;
            const color = vibeToHex(vibe);
            return (
              <motion.div
                key={vibe}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
              >
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start h-auto p-3 border-2 transition-all hover:scale-[1.02]",
                    `border-[${color}] hover:bg-[${color}]/10`
                  )}
                  style={{
                    borderColor: color,
                  }}
                  onClick={() => handleVibeSelect(vibe)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-left">
                        <div className="font-medium text-sm">{getVibeLabel(vibe)}</div>
                        <div className="text-xs text-muted-foreground">
                          {prediction.reasoning || 'Based on your patterns'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(prediction.confidence * 100)}%
                    </Badge>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>

        {suggestions.activitySuggestions?.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Activity suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {suggestions.activitySuggestions.slice(0, 3).map((activity: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {activity}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}