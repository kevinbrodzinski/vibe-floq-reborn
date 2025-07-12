import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VenueListItem } from './VenueListItem';
import { useVenuesNearMe } from '@/hooks/useVenuesNearMe';
import { useOptimizedGeolocation } from '@/hooks/useOptimizedGeolocation';
import { GeolocationPrompt } from '@/components/ui/geolocation-prompt';
import { Z_LAYERS } from '@/lib/z-layers';
import { cn } from '@/lib/utils';

interface ResizableVenuesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueTap: (venueId: string) => void;
}

// Snap positions as viewport height percentages
const SNAP_POINTS = [0.25, 0.5, 0.85] as const;
const COLLAPSED = 0;
const HALF = 1;
const EXPANDED = 2;

export function ResizableVenuesSheet({ isOpen, onClose, onVenueTap }: ResizableVenuesSheetProps) {
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

  const [snapPosition, setSnapPosition] = useState(COLLAPSED);
  const y = useMotionValue(0);
  
  // Calculate snap positions in pixels
  const getSnapValue = useCallback((position: number) => {
    const vh = window.innerHeight;
    const snapPercent = SNAP_POINTS[position];
    return -(vh * snapPercent) + (vh * SNAP_POINTS[COLLAPSED]);
  }, []);

  // Handle drag end to find nearest snap point
  const handleDragEnd = useCallback((_, info) => {
    const velocity = info.velocity.y;
    const currentY = info.point.y;
    const vh = window.innerHeight;
    
    // Determine direction and threshold
    let newPosition = snapPosition;
    
    if (velocity > 500) {
      // Fast downward drag - collapse
      newPosition = Math.max(0, snapPosition - 1);
    } else if (velocity < -500) {
      // Fast upward drag - expand
      newPosition = Math.min(SNAP_POINTS.length - 1, snapPosition + 1);
    } else {
      // Slow drag - find nearest snap point
      const currentPercent = 1 - (currentY / vh);
      let closestPosition = 0;
      let closestDistance = Math.abs(currentPercent - SNAP_POINTS[0]);
      
      for (let i = 1; i < SNAP_POINTS.length; i++) {
        const distance = Math.abs(currentPercent - SNAP_POINTS[i]);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPosition = i;
        }
      }
      newPosition = closestPosition;
    }
    
    setSnapPosition(newPosition);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(7);
    }
  }, [snapPosition]);

  // Handle tap on grabber to toggle between collapsed and half
  const handleGrabberTap = useCallback(() => {
    const newPosition = snapPosition === COLLAPSED ? HALF : COLLAPSED;
    setSnapPosition(newPosition);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(7);
    }
  }, [snapPosition]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Close handler
  const handleClose = useCallback(() => {
    setSnapPosition(COLLAPSED);
    setTimeout(onClose, 200); // Allow animation to complete
  }, [onClose]);

  if (!isOpen) return null;

  const currentHeight = `${SNAP_POINTS[snapPosition] * 100}vh`;
  const isCollapsed = snapPosition === COLLAPSED;

  return (
    <motion.div
      layout={false}
      drag="y"
      dragConstraints={{ 
        top: getSnapValue(EXPANDED) - getSnapValue(COLLAPSED),
        bottom: 0 
      }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ 
        y,
        bottom: `calc(var(--mobile-nav-height) + env(safe-area-inset-bottom))`,
        height: currentHeight,
        zIndex: Z_LAYERS.VENUES_CHIP + 5
      }}
      initial={{ y: 200, opacity: 0 }}
      animate={{ 
        y: 0, 
        opacity: 1,
        height: currentHeight
      }}
      exit={{ y: 200, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        height: { duration: 0.3 }
      }}
      className={cn(
        "fixed inset-x-4 rounded-t-3xl pointer-events-auto",
        "bg-background/95 backdrop-blur-md border border-border/40",
        "shadow-2xl flex flex-col overflow-hidden"
      )}
    >
      {/* Grabber Handle */}
      <motion.button
        onClick={handleGrabberTap}
        className="grabber h-6 w-full flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
        whileTap={{ scale: 0.95 }}
        role="button"
        tabIndex={0}
        aria-label={isCollapsed ? "Expand venues sheet" : "Collapse venues sheet"}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGrabberTap();
          }
        }}
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 250, damping: 24 }}
        >
          <ChevronDown className="size-4 text-muted-foreground" />
        </motion.div>
      </motion.button>

      {/* Header - only show when expanded */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between px-6 py-4 border-b border-border/40"
          >
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
              onClick={handleClose}
              className="w-8 h-8 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <ScrollArea className="flex-1 pointer-events-auto">
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

      {/* Actions - only show when expanded */}
      <AnimatePresence>
        {snapPosition === EXPANDED && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="p-4 border-t border-border/40 bg-background/50 pointer-events-auto"
          >
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Close
              </Button>
              <Button className="flex-1" onClick={() => {
                // Navigate to full venues view
              }}>
                <Users className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}