import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  MapPin, 
  Users, 
  TrendingUp, 
  Zap,
  AlertTriangle,
  Heart,
  DollarSign,
  Calendar,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/providers/AuthProvider';
import { BaseVenueCard, VenueStatGrid, VenueHighlight, VenueWarning } from '@/components/ui/BaseVenueCard';
import type { VenueRecommendation } from '@/hooks/useVenueRecommendations';

interface VenueRecommendationCardProps {
  venue: VenueRecommendation;
  onVisit: (venueId: string) => void;
}

export const VenueRecommendationCard: React.FC<VenueRecommendationCardProps> = ({
  venue,
  onVisit
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();

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

  // Header badges
  const headerBadge = (
    <Badge className={cn("text-xs px-2 py-1", getAtmosphereColor(venue.realTime.atmosphereLevel))}>
      {venue.realTime.atmosphereLevel} energy
    </Badge>
  );

  const distanceBadge = (
    <Badge variant="outline" className="bg-white/90 text-black text-xs px-2 py-1">
      {venue.distance} • {venue.travelTime}
    </Badge>
  );

  // Metadata extra (price level only, score goes in separate area)
  const metadataExtra = (
    <>
      <span className="hidden sm:inline">•</span>
      <span className="text-xs">{venue.priceLevel}</span>
    </>
  );

  // Right badge for header
  const rightBadge = (
    <div className="text-right flex-shrink-0">
      <div className="flex items-center gap-1 text-green-600 font-medium text-xs sm:text-sm">
        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
        {Math.round(venue.vibeMatch.score * 100)}%
      </div>
      <div className="text-xs text-muted-foreground">
        {Math.round(venue.confidence * 100)}% confident
      </div>
    </div>
  );

  // Content sections
  const vibeMatchSection = (
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
  );

  const statsSection = (
    <VenueStatGrid 
      stats={[
        { label: "Current capacity", value: `${venue.crowdIntelligence.currentCapacity}%`, color: "text-primary" },
        { label: "Friends visited", value: venue.socialProof.friendVisits, color: "text-green-600" },
        { label: "Friend rating", value: venue.socialProof.networkRating, color: "text-blue-600" }
      ]}
    />
  );

  const realTimeSection = (venue.realTime.liveEvents.length > 0 || venue.realTime.specialOffers.length > 0) ? (
    <div className="space-y-2">
      {venue.realTime.liveEvents.length > 0 && (
        <VenueHighlight 
          icon={<Music className="w-4 h-4" />}
          title="Live Events"
          items={venue.realTime.liveEvents}
          iconColor="text-primary"
        />
      )}
      {venue.realTime.specialOffers.length > 0 && (
        <VenueHighlight 
          icon={<DollarSign className="w-4 h-4" />}
          title="Special Offers"
          items={venue.realTime.specialOffers}
          iconColor="text-green-600"
        />
      )}
    </div>
  ) : null;

  const warningsSection = venue.warnings && venue.warnings.length > 0 ? (
    <VenueWarning 
      icon={<AlertTriangle className="w-4 h-4" />}
      title="Good to know"
      items={venue.warnings}
    />
  ) : null;

  // Action buttons with useCallback to prevent stale closures
  const handleToggleFavorite = useCallback(() => {
    if (!user) return;
    toggleFavorite({
      itemId: venue.id,
      itemType: 'venue',
      title: venue.name,
      description: venue.category,
      imageUrl: venue.imageUrl
    });
  }, [user, venue.id, venue.name, venue.category, venue.imageUrl, toggleFavorite]);

  const handleDirections = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onVisit(venue.id);
  }, [onVisit, venue.id]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleFavorite();
  }, [handleToggleFavorite]);

  const actionButtons = (
    <>
      <Button 
        variant="secondary" 
        size="sm"
        className="flex-1 text-xs sm:text-sm h-8 sm:h-10"
        onClick={handleDirections}
      >
        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
        Directions
      </Button>
      <Button 
        variant={isFavorite(venue.id) ? "default" : "outline"}
        size="sm"
        className={cn(
          "flex-1 text-xs sm:text-sm h-8 sm:h-10",
          isFavorite(venue.id) && "bg-red-500 hover:bg-red-600 text-white"
        )}
        onClick={handleFavoriteClick}
        disabled={!user || isToggling}
      >
        <Heart className={cn(
          "w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2",
          isFavorite(venue.id) && "fill-current"
        )} />
        {isToggling ? '...' : isFavorite(venue.id) ? 'Saved' : 'Save'}
      </Button>
    </>
  );

  // Expandable content
  const expandableContent = (
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
  );

  return (
    <BaseVenueCard
      name={venue.name}
      imageUrl={venue.imageUrl}
      category={venue.category}
      rating={venue.rating}
      headerBadge={headerBadge}
      distanceBadge={distanceBadge}
      metadataExtra={metadataExtra}
      rightBadge={rightBadge}
      imageHeight="h-32"
      contentSections={[
        vibeMatchSection,
        statsSection,
        realTimeSection,
        warningsSection
      ]}
      actionButtons={actionButtons}
      expandableContent={expandableContent}
    />
  );
};