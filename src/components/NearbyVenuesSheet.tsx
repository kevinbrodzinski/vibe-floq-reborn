import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VenueListItem } from './VenueListItem';
import { useVenuesNearMe } from '@/hooks/useVenuesNearMe';
import { useOptimizedGeolocation } from '@/hooks/useOptimizedGeolocation';
import { GeolocationPrompt } from '@/components/ui/geolocation-prompt';

interface NearbyVenuesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueTap: (venueId: string) => void;
}

export function NearbyVenuesSheet({ isOpen, onClose, onVenueTap }: NearbyVenuesSheetProps) {
  const { lat, lng, loading: locationLoading, error } = useOptimizedGeolocation();
  const hasPermission = !!(lat && lng);
  const requestLocation = () => window.location.reload();
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
          <div className="p-4">
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
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Finding nearby venues...</p>
                </div>
              </div>
            ) : allVenues.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">No venues found</p>
                    <p className="text-sm text-muted-foreground">
                      No venues within 500m of your location
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <AnimatePresence mode="popLayout">
                  {allVenues.map((venue) => (
                    <motion.div
                      key={venue.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <VenueListItem
                        venue={venue}
                        onTap={onVenueTap}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Load More Button */}
                {hasNextPage && (
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isFetchingNextPage}
                      className="w-full"
                    >
                      {isFetchingNextPage ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Loading more...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Load more venues
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
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