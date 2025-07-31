import React, { useState } from 'react';
import { MapPin, Star, Users, DollarSign, Filter, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { usePersonalizedVenues, type PersonalizedVenue, type PriceTier } from '@/hooks/usePersonalizedVenues';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { useGeo } from '@/hooks/useGeo';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PersonalizedVenueBrowserProps {
  className?: string;
}

const categoryOptions = [
  { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { value: 'bar', label: 'Bars', icon: '🍸' },
  { value: 'cafe', label: 'Cafés', icon: '☕' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'fitness', label: 'Fitness', icon: '💪' }
];

const vibeOptions = [
  { value: 'chill', label: 'Chill', icon: '🌿' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'hype', label: 'Hype', icon: '🔥' },
  { value: 'romantic', label: 'Romantic', icon: '💕' }
];

export const PersonalizedVenueBrowser: React.FC<PersonalizedVenueBrowserProps> = ({
  className
}) => {
  const navigate = useNavigate();
  const { coords } = useGeo();
  const lat = coords?.lat;
  const lng = coords?.lng;

  const [radius, setRadius] = useState(1000);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string | undefined>();
  const [maxPriceTier, setMaxPriceTier] = useState<PriceTier>('$$$$');
  const [showFilters, setShowFilters] = useState(false);

  const { view, favorite, share } = useVenueInteractions();

  const {
    data: venues = [],
    isLoading,
    error,
    refetch
  } = usePersonalizedVenues(lat, lng, {
    radius,
    limit: 20,
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    maxPriceTier,
    vibe: selectedVibe
  });

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleVenueAction = (action: string, venue: PersonalizedVenue) => {
    try {
      switch (action) {
        case 'visit':
          view(venue.venue_id);
          navigate(`/venues/${venue.venue_id}`);
          break;
        case 'favorite':
          favorite(venue.venue_id);
          toast.success(`Added ${venue.name} to favorites!`);
          break;
        case 'share':
          share(venue.venue_id);
          if (navigator.share) {
            navigator.share({
              title: venue.name,
              text: `Check out ${venue.name}`,
              url: `${window.location.origin}/venues/${venue.venue_id}`
            });
          } else {
            navigator.clipboard.writeText(
              `${window.location.origin}/venues/${venue.venue_id}`
            );
            toast.success('Link copied to clipboard!');
          }
          break;
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error('Action failed. Please try again.');
    }
  };

  const getPriceTierDisplay = (tier: PriceTier) => {
    return tier;
  };

  return (
    <Card className={cn("border-border/30 bg-card/50 backdrop-blur-sm", className)}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <MapPin className="w-3 h-3 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Venue Browser</h3>
            <Badge variant="secondary" className="text-xs">
              Personalized
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-6 w-6 p-0"
          >
            <Filter className="w-3 h-3" />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4 mb-4 p-3 border border-border/30 rounded-lg bg-muted/20">
            {/* Radius */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Radius: {(radius / 1000).toFixed(1)}km
              </label>
              <Slider
                value={[radius]}
                onValueChange={(value) => setRadius(value[0])}
                max={5000}
                min={500}
                step={250}
                className="w-full"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Categories
              </label>
              <div className="grid grid-cols-3 gap-1">
                {categoryOptions.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => handleCategoryToggle(category.value)}
                    className={cn(
                      "p-2 rounded-md border transition-all text-xs",
                      selectedCategories.includes(category.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className="text-sm mb-1">{category.icon}</div>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Vibe
              </label>
              <div className="grid grid-cols-4 gap-1">
                {vibeOptions.map((vibe) => (
                  <button
                    key={vibe.value}
                    onClick={() => setSelectedVibe(
                      selectedVibe === vibe.value ? undefined : vibe.value
                    )}
                    className={cn(
                      "p-2 rounded-md border transition-all text-xs",
                      selectedVibe === vibe.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className="text-sm mb-1">{vibe.icon}</div>
                    {vibe.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Tier */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Max Price: {getPriceTierDisplay(maxPriceTier)}
              </label>
              <div className="grid grid-cols-4 gap-1">
                {['$', '$$', '$$$', '$$$$'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setMaxPriceTier(tier as PriceTier)}
                    className={cn(
                      "p-2 rounded-md border transition-all text-xs",
                      maxPriceTier === tier
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Finding venues...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">Something went wrong</p>
            <Button 
              onClick={() => refetch()} 
              size="sm"
              variant="outline"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        ) : venues.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {venues.length} venues found
              </span>
              <Badge variant="secondary" className="text-xs">
                Score Ranked ⚡
              </Badge>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {venues.map((venue) => (
                <div
                  key={venue.venue_id}
                  className="p-3 rounded-lg border border-border/30 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer"
                  onClick={() => handleVenueAction('visit', venue)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium truncate">
                          {venue.name}
                        </span>
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {getPriceTierDisplay(venue.price_tier)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {venue.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {(venue.distance_m / 1000).toFixed(1)}km
                        </span>
                        {venue.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs text-muted-foreground">
                              {venue.rating}
                            </span>
                          </div>
                        )}
                        {venue.live_count > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {venue.live_count}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-accent" />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(venue.personalized_score * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVenueAction('favorite', venue);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !isLoading && (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">No venues found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};