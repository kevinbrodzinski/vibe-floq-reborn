import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Users, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { VenueListItem } from './VenueListItem';
import { useVenuesNearMe } from '@/hooks/useVenuesNearMe';
import { usePersonalizedVenues } from '@/hooks/usePersonalizedVenues';
import { useGeo } from '@/hooks/useGeo';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { GeolocationPrompt } from '@/components/ui/geolocation-prompt';

interface NearbyVenuesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueTap: (venueId: string) => void;
}

export function NearbyVenuesSheet({ isOpen, onClose, onVenueTap }: NearbyVenuesSheetProps) {
  const { coords, status, error } = useGeo();
  const currentVibe = useCurrentVibe();
  const lat = coords?.lat;
  const lng = coords?.lng;
  const locationLoading = status === 'loading';
  const hasPermission = !!(lat && lng);
  const requestLocation = () => window.location.reload();
  
  // Get personalized recommendations
  const { 
    data: personalizedVenues = [], 
    isLoading: personalizedLoading 
  } = usePersonalizedVenues(
    lat,
    lng,
    {
      radius: 3000,
      limit: 6, // Top 6 picks
      vibe: currentVibe || undefined,
      useLLM: true, // Enable LLM for top picks
      llmTopK: 24
    }
  );

  // Get all nearby venues
  const { 
    data, 
    isLoading, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage 
  } = useVenuesNearMe(lat, lng, 0.5);

  const allVenues = data?.pages.flatMap(page => page.venues) ?? [];
  const totalLiveCount = allVenues.reduce((sum, venue) => sum + (venue.live_count || 0), 0);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="max-h-[65vh] flex flex-col p-0 gap-0 rounded-t-3xl border-0 bg-background/95 backdrop-blur-md"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Nearby Venues
              </h2>
              <p className="text-sm text-muted-foreground">
                {allVenues.length} venues • {totalLiveCount} people online
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {!hasPermission && !lat && !lng ? (
              <div className="flex items-center justify-center py-12">
                <GeolocationPrompt onRequestLocation={requestLocation} loading={locationLoading} />
              </div>
            ) : locationLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Getting your location...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Top Picks Section */}
                {hasPermission && personalizedVenues && personalizedVenues.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <h3 className="font-medium text-foreground">Top picks nearby</h3>
                      {currentVibe && (
                        <Badge variant="secondary" className="text-xs">
                          {currentVibe}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {personalizedVenues.map((venue) => (
                        <div
                          key={venue.venue_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer"
                          onClick={() => onVenueTap(venue.venue_id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm text-foreground truncate">
                                {venue.name}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(venue.distance_m)}m
                              </span>
                            </div>
                            {venue.reason && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {venue.reason}
                              </p>
                            )}
                          </div>
                          <div className="text-xs font-medium text-primary ml-2">
                            {venue.personalized_score ? Math.round(venue.personalized_score * 100) : '—'}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Venues Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">All nearby venues</h3>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground">Finding nearby venues...</p>
                      </div>
                    </div>
                  ) : allVenues.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-2">
                        <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                        <p className="text-sm text-muted-foreground">No venues found nearby</p>
                        <p className="text-xs text-muted-foreground/70">Try expanding your search radius</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {allVenues.map((venue, index) => (
                          <motion.div
                            key={venue.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ 
                              duration: 0.3,
                              delay: Math.min(index * 0.05, 0.3)
                            }}
                          >
                            <VenueListItem 
                              venue={venue}
                              onTap={() => onVenueTap(venue.id)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {hasNextPage && (
                        <div className="flex justify-center pt-4">
                          <Button 
                            variant="outline" 
                            onClick={handleLoadMore}
                            disabled={isFetchingNextPage}
                            className="w-full"
                          >
                            {isFetchingNextPage ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                Loading more...
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-2" />
                                Load more venues
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 border-t border-border/40 bg-background/50">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => {
              // Navigate to full venues view
            }}>
              <Users className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}