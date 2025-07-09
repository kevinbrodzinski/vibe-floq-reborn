import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VenueListItem } from './VenueListItem';
import { useClusterVenues } from '@/hooks/useClusterVenues';

interface ClusterVenuesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  clusterId: number | null;
  onVenueTap: (venueId: string) => void;
  onZoomToArea?: () => void;
}

export function ClusterVenuesSheet({ 
  isOpen, 
  onClose, 
  clusterId, 
  onVenueTap, 
  onZoomToArea 
}: ClusterVenuesSheetProps) {
  const { data: venues = [], isLoading } = useClusterVenues(clusterId);
  
  const totalLiveCount = 0; // Cluster venues don't have live count in current implementation

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
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading venues...</p>
                </div>
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
                      transition={{ duration: 0.2 }}
                    >
                      <VenueListItem
                        venue={{
                          ...venue,
                          distance_m: undefined, // Cluster venues don't have distance
                          live_count: undefined, // Cluster venues don't have live count
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
              <Button className="flex-1" onClick={onZoomToArea}>
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