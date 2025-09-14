import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Heart, X, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Vibe } from '@/lib/vibes';
import type { VibeReading } from '@/core/vibe/types';
import type { PersonalityInsights } from '@/types/personality';

interface VibePrediction {
  vibe: Vibe;
  confidence: number;
  timeWindow: string;
  reasoning: string;
}

interface VenueRecommendation {
  name: string;
  type: string;
  distance: string;
  vibeMatch: number;
  coordinates?: { lat: number; lng: number };
}

interface ActionableRecommendationsProps {
  reading: VibeReading;
  patterns?: PersonalityInsights | null;
  location?: { lat: number; lng: number };
  onVibeSelect?: (vibe: Vibe) => void;
  onDismissRecommendation?: (id: string) => void;
  className?: string;
}

/**
 * Actionable recommendations with real buttons and interactions
 */
export function ActionableRecommendations({ 
  reading, 
  patterns, 
  location,
  onVibeSelect,
  onDismissRecommendation,
  className 
}: ActionableRecommendationsProps) {
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  // Generate vibe predictions based on patterns
  const vibePredictions = React.useMemo((): VibePrediction[] => {
    if (!patterns?.hasEnoughData) return [];

    const predictions: VibePrediction[] = [];
    const currentHour = new Date().getHours();

    // Next 3-hour window prediction
    if (currentHour < 15 && patterns.chronotype === 'lark') {
      predictions.push({
        vibe: 'flowing',
        confidence: 0.75,
        timeWindow: '3pm today',
        reasoning: 'Your energy typically peaks in mid-afternoon'
      });
    }

    if (currentHour < 19 && patterns.socialType === 'social') {
      predictions.push({
        vibe: 'social',
        confidence: 0.7,
        timeWindow: '7pm today',
        reasoning: 'Evening social pattern detected'
      });
    }

    return predictions.filter(p => p.confidence >= 0.6);
  }, [patterns]);

  // Generate venue recommendations
  const venueRecommendations = React.useMemo((): VenueRecommendation[] => {
    if (!reading.venueIntelligence || !location) return [];

    const recs: VenueRecommendation[] = [];

    // Suggest complementary venues based on current vibe
    if (reading.vibe === 'chill') {
      recs.push({
        name: 'Nearby Café',
        type: 'café',
        distance: '0.3 mi',
        vibeMatch: 0.8
      });
    }

    if (reading.vibe === 'social') {
      recs.push({
        name: 'Local Bar',
        type: 'bar',
        distance: '0.5 mi',
        vibeMatch: 0.9
      });
    }

    return recs;
  }, [reading, location]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    onDismissRecommendation?.(id);
  };

  const filteredPredictions = vibePredictions.filter(p => 
    !dismissedIds.has(`prediction-${p.vibe}-${p.timeWindow}`)
  );

  const filteredVenues = venueRecommendations.filter(v => 
    !dismissedIds.has(`venue-${v.name}`)
  );

  if (filteredPredictions.length === 0 && filteredVenues.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Smart Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vibe Predictions */}
        <AnimatePresence>
          {filteredPredictions.map((prediction) => {
            const predictionId = `prediction-${prediction.vibe}-${prediction.timeWindow}`;
            return (
              <motion.div
                key={predictionId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-primary/5 rounded-lg border border-primary/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="text-sm font-medium">
                      Next up: {prediction.vibe}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(prediction.confidence * 100)}%
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDismiss(predictionId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {prediction.reasoning}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onVibeSelect?.(prediction.vibe)}
                  >
                    Set Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Remind Me
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Venue Recommendations */}
        <AnimatePresence>
          {filteredVenues.map((venue) => {
            const venueId = `venue-${venue.name}`;
            return (
              <motion.div
                key={venueId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="text-sm font-medium">{venue.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {venue.distance}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDismiss(venueId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {Math.round(venue.vibeMatch * 100)}% vibe match • {venue.type}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Navigate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}