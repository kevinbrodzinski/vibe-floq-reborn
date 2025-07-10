import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { VenueListItem } from './VenueListItem';
import { useClusterVenues } from '@/hooks/useClusterVenues';

interface ClusterVenuesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  clusterBbox: [number, number, number, number] | null;
  onVenueTap: (venueId: string) => void;
  onZoomToArea?: () => void;
}

export function ClusterVenuesSheet({ 
  isOpen, 
  onClose, 
  clusterBbox, 
  onVenueTap, 
  onZoomToArea 
}: ClusterVenuesSheetProps) {
  // Stabilize the bbox to prevent constant React Query refetches
  const stableBbox = useMemo(() => {
    if (!clusterBbox) return null;
    return clusterBbox.map(n => +n.toFixed(6)) as [number, number, number, number];
  }, [clusterBbox]);

  const { data: venues = [], isLoading, error, refetch } = useClusterVenues(stableBbox);
  
  // Calculate total live count from the new RPC data
  const totalLiveCount = venues.reduce((sum, venue) => sum + venue.live_count, 0);

  // Add haptic feedback when sheet opens
  React.useEffect(() => {
    if (isOpen && 'vibrate' in navigator) {
      navigator.vibrate(4);
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="max-h-[65vh] flex flex-col p-0 gap-0 rounded-t-3xl border-0 bg-background/95 backdrop-blur-md"
      >
        {/* Accessibility title */}
        <SheetTitle className="sr-only">Cluster venues</SheetTitle>
        
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
                {venues.length} venues in this area
              </h2>
              {totalLiveCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  👥 {totalLiveCount} people online
                </p>
              )}
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
            {error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Couldn't load venues</p>
                    <p className="text-sm text-muted-foreground">
                      Please try again
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="space-y-0" role="status" aria-label="Loading venues">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border-b border-border/40 last:border-0">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="w-5 h-5 rounded-full" />
                  </div>
                ))}
              </div>
            ) : venues.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">No venues found</p>
                    <p className="text-sm text-muted-foreground">
                      This cluster appears to be empty
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <AnimatePresence mode="popLayout">
                  {venues.map((venue) => (
                    <motion.div
                      key={venue.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", damping: 22, duration: 0.2 }}
                    >
                      <VenueListItem
                        venue={{
                          id: venue.id,
                          name: venue.name,
                          lat: venue.lat,
                          lng: venue.lng,
                          vibe: venue.category, // Map category to vibe for VenueListItem
                          source: 'cluster', // Static source for cluster venues
                          distance_m: undefined, // Cluster venues don't have distance
                          live_count: venue.live_count,
                        }}
                        onTap={onVenueTap}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
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
            {onZoomToArea && (
              <Button 
                className="flex-1" 
                onClick={onZoomToArea}
                role="button"
                aria-label="Zoom to area to explore venues"
              >
                <Users className="w-4 h-4 mr-2" />
                Zoom to area
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}