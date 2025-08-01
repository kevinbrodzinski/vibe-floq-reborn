import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/providers/AuthProvider';
import { 
  ChevronDown, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp, 
  Star, 
  Zap,
  AlertTriangle,
  Heart,
  DollarSign,
  Calendar,
  Music,
  Utensils
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VenueRecommendation } from '@/hooks/useVenueRecommendations';

interface VenueRecommendationCardProps {
  venue: VenueRecommendation;
  onVisit: (venueId: string) => void;
  onSave?: (venueId: string) => void; // Make optional since we'll handle it internally
}

export const VenueRecommendationCard: React.FC<VenueRecommendationCardProps> = ({
  venue,
  onVisit,
  onSave
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();

  const isVenueFavorited = isFavorite(venue.id);

  const handleSaveToggle = async () => {
    if (!user) return;

    await toggleFavorite({
      itemId: venue.id,
      itemType: 'venue',
      title: venue.name,
      description: `${venue.category} • ${venue.rating}★`,
      imageUrl: venue.imageUrl,
    });

    // Call the optional onSave prop if provided
    onSave?.(venue.id);
  };

  const getAtmosphereColor = (level: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-700',
      moderate: 'bg-green-100 text-green-700', 
      high: 'bg-orange-100 text-orange-700',
      peak: 'bg-red-100 text-red-700'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getVibeColor = (vibe: string) => {
    const colors: { [key: string]: string } = {
      flowing: 'bg-blue-100 text-blue-700',
      social: 'bg-purple-100 text-purple-700',
      creative: 'bg-green-100 text-green-700',
      mindful: 'bg-indigo-100 text-indigo-700',
      sophisticated: 'bg-gray-100 text-gray-800',
      energetic: 'bg-red-100 text-red-700'
    };
    return colors[vibe] || 'bg-gray-100 text-gray-700';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={cn(
          "w-3 h-3",
          i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )} 
      />
    ));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
    >
      <Card className="overflow-hidden">
        {/* Header with image and basic info */}
        <div className="relative h-24 sm:h-32 overflow-hidden">
          <img 
            src={venue.imageUrl} 
            alt={venue.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
            <Badge className={cn("text-xs px-2 py-1", getAtmosphereColor(venue.realTime.atmosphereLevel))}>
              {venue.realTime.atmosphereLevel} energy
            </Badge>
          </div>
          <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2">
            <Badge variant="outline" className="bg-white/90 text-black text-xs px-2 py-1">
              {venue.distance} • {venue.travelTime}
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">{venue.name}</CardTitle>
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                <span className="truncate">{venue.category}</span>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  {renderStars(venue.rating)}
                  <span className="text-xs">({venue.rating})</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span className="text-xs">{venue.priceLevel}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 text-green-600 font-medium text-xs sm:text-sm">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                {Math.round(venue.vibeMatch.score * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(venue.confidence * 100)}% confident
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
          {/* Vibe matching explanation */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-2 sm:p-3">
            <h4 className="text-xs sm:text-sm font-medium mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Why This Matches Your Vibe
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 leading-relaxed">{venue.vibeMatch.explanation}</p>
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">Your vibes:</span>
              {venue.vibeMatch.userVibes.map((vibe, idx) => (
                <Badge key={idx} variant="outline" className={cn("text-xs px-1 py-0", getVibeColor(vibe))}>
                  {vibe}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground mx-1">+</span>
              <span className="text-xs text-muted-foreground">Venue vibes:</span>
              {venue.vibeMatch.venueVibes.map((vibe, idx) => (
                <Badge key={idx} variant="outline" className={cn("text-xs px-1 py-0", getVibeColor(vibe))}>
                  {vibe}
                </Badge>
              ))}
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div>
              <div className="text-sm sm:text-lg font-semibold text-primary">{venue.crowdIntelligence.currentCapacity}%</div>
              <div className="text-xs text-muted-foreground leading-tight">Current capacity</div>
            </div>
            <div>
              <div className="text-sm sm:text-lg font-semibold text-green-600">{venue.socialProof.friendVisits}</div>
              <div className="text-xs text-muted-foreground leading-tight">Friends visited</div>
            </div>
            <div>
              <div className="text-sm sm:text-lg font-semibold text-blue-600">{venue.socialProof.networkRating}</div>
              <div className="text-xs text-muted-foreground leading-tight">Friend rating</div>
            </div>
          </div>

          {/* Real-time highlights */}
          {(venue.realTime.liveEvents.length > 0 || venue.realTime.specialOffers.length > 0) && (
            <div className="space-y-2">
              {venue.realTime.liveEvents.length > 0 && (
                <div className="flex items-start gap-2">
                  <Music className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Live Events</div>
                    {venue.realTime.liveEvents.map((event, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground">• {event}</div>
                    ))}
                  </div>
                </div>
              )}
              {venue.realTime.specialOffers.length > 0 && (
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Special Offers</div>
                    {venue.realTime.specialOffers.map((offer, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground">• {offer}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warnings if any */}
          {venue.warnings && venue.warnings.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-orange-800">Good to know</div>
                  {venue.warnings.map((warning, idx) => (
                    <div key={idx} className="text-sm text-orange-700">• {warning}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              className="flex-1 text-xs sm:text-sm h-8 sm:h-10"
              onClick={() => onVisit(venue.id)}
            >
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Directions
            </Button>
            <Button 
              variant={isVenueFavorited ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-1 text-xs sm:text-sm h-8 sm:h-10",
                isVenueFavorited && "bg-red-500 hover:bg-red-600 text-white"
              )}
              onClick={handleSaveToggle}
              disabled={isToggling || !user}
            >
              <Heart 
                className={cn(
                  "w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2",
                  isVenueFavorited && "fill-current"
                )} 
              />
              {isToggling ? "..." : isVenueFavorited ? "Saved" : "Save"}
            </Button>
          </div>

          {/* Expandable detailed reasoning */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
                <span>View detailed intelligence</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showDetails && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="mt-4 space-y-4 text-sm">
                {/* Crowd Intelligence */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Crowd Intelligence
                  </h4>
                  <div className="space-y-2 text-muted-foreground">
                    <p><strong>Typical crowd:</strong> {venue.crowdIntelligence.typicalCrowd}</p>
                    <p><strong>Predicted peak:</strong> {venue.crowdIntelligence.predictedPeak}</p>
                    <p><strong>Friend compatibility:</strong> {venue.crowdIntelligence.friendCompatibility}</p>
                    <p><strong>Current wait:</strong> {venue.realTime.waitTime}</p>
                  </div>
                </div>

                {/* Social Proof */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    Social Proof
                  </h4>
                  <div className="space-y-2 text-muted-foreground">
                    <p><strong>Popular with:</strong> {venue.socialProof.popularWith}</p>
                    <p><strong>Recent visitors:</strong> {venue.socialProof.recentVisitors.join(', ')}</p>
                    {venue.socialProof.testimonials && (
                      <div>
                        <p className="font-medium">What friends say:</p>
                        {venue.socialProof.testimonials.map((testimonial, idx) => (
                          <p key={idx} className="italic">"{testimonial}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contextual Reasoning */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Contextual Factors
                  </h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p>• {venue.context.dayOfWeek}</p>
                    <p>• {venue.context.timeRelevance}</p>
                    <p>• {venue.context.weatherSuitability}</p>
                    <p>• {venue.context.moodAlignment}</p>
                  </div>
                </div>

                {/* Top Reasons */}
                <div>
                  <h4 className="font-medium mb-2">Top Reasons for This Recommendation</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    {venue.topReasons.map((reason, idx) => (
                      <li key={idx}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </motion.div>
  );
};