import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, useMotionValue, PanInfo, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VenueListItem } from './VenueListItem';
import { useVenuesNearMe } from '@/hooks/useVenuesNearMe';
import { useOptimizedGeolocation } from '@/hooks/useOptimizedGeolocation';
import { GeolocationPrompt } from '@/components/ui/geolocation-prompt';
import { Z_LAYERS } from '@/lib/z-layers';
import { cn } from '@/lib/utils';
import { FixedSizeList as List } from 'react-window';

interface ResizableVenuesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueTap: (venueId: string) => void;
}

// Single state: either open (expanded) or closed (unmounted)
const EXPANDED_TRANSFORM = 'translateY(0px)';

// Spring physics configuration
const SPRING_CONFIG = {
  type: "spring",
  stiffness: 400,
  damping: 40,
  mass: 0.8,
} as const;

// Haptic feedback patterns
const HAPTIC_PATTERNS = {
  light: 10,
  medium: 20,
  heavy: 50,
} as const;

// Memoized venue list item for performance
const VenueItem = React.memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: { venues: any[]; onVenueTap: (id: string) => void } 
}) => (
  <div style={style}>
    <VenueListItem
      venue={data.venues[index]}
      onTap={data.onVenueTap}
    />
  </div>
));

VenueItem.displayName = 'VenueItem';

export function ResizableVenuesSheet({ isOpen, onClose, onVenueTap }: ResizableVenuesSheetProps) {
  const { lat, lng, loading: locationLoading, error } = useOptimizedGeolocation();
  const hasPermission = !!(lat && lng);
  const requestLocation = useCallback(() => window.location.reload(), []);
  
  const { 
    data, 
    isLoading, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage 
  } = useVenuesNearMe(lat, lng, 0.5);

  // Memoized venue data
  const { allVenues, totalLiveCount } = useMemo(() => {
    const venues = data?.pages.flatMap(page => page.venues) ?? [];
    const liveCount = venues.reduce((sum, venue) => sum + (venue.live_count || 0), 0);
    return { allVenues: venues, totalLiveCount: liveCount };
  }, [data]);

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);

  // Announce open/close for screen readers
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = isOpen ? 'Venues sheet opened' : 'Venues sheet closed';
    }
  }, [isOpen]);

  // Haptic feedback helper
  const triggerHaptic = useCallback((pattern: keyof typeof HAPTIC_PATTERNS) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(HAPTIC_PATTERNS[pattern]);
    }
  }, []);

  // Memoized drag handlers
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // Track drag for visual feedback during dragging
  }, []);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { velocity, offset } = info;
    const velocityThreshold = 300;
    const dragThreshold = 150;
    
    // Simple logic: if dragging down with enough force, close the sheet
    if (velocity.y > velocityThreshold || offset.y > dragThreshold) {
      triggerHaptic('medium');
      onClose();
    }
    
    setIsDragging(false);
  }, [onClose, triggerHaptic]);

  // Grabber tap closes the sheet
  const handleGrabberTap = useCallback(() => {
    triggerHaptic('medium');
    onClose();
  }, [onClose, triggerHaptic]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, onClose]);

  // Memoized load more handler
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Memoized close handler with haptic
  const handleClose = useCallback(() => {
    triggerHaptic('light');
    onClose();
  }, [onClose, triggerHaptic]);

  // Safe area and reduced motion support
  const prefersReducedMotion = useMemo(() => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches, []
  );

  // Memoized list data for react-window
  const listData = useMemo(() => ({
    venues: allVenues,
    onVenueTap
  }), [allVenues, onVenueTap]);

  // If not open, unmount completely to prevent navigation blocking
  if (!isOpen) return null;

  const shouldUseVirtualization = allVenues.length > 50;

  return (
    <>
      {/* Backdrop overlay - doesn't cover navigation */}
      <motion.div
        className="fixed inset-x-0 top-0 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] bg-black/50"
        style={{ zIndex: 55 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      
      <motion.div
        ref={containerRef}
        className={cn(
          "fixed inset-x-4 pointer-events-auto",
          "bg-background/95 backdrop-blur-md border border-border/40",
          "shadow-2xl rounded-t-3xl overflow-hidden",
          "will-change-transform"
        )}
        style={{
          bottom: `calc(var(--mobile-nav-height, 75px) + env(safe-area-inset-bottom))`,
          height: '80vh',
          touchAction: 'pan-y',
          zIndex: 60,
        }}
        initial={{ 
          transform: 'translateY(100%)', 
          opacity: 0 
        }}
        animate={{ 
          transform: EXPANDED_TRANSFORM,
          opacity: 1,
        }}
        exit={{ 
          transform: 'translateY(100%)', 
          opacity: 0 
        }}
        transition={prefersReducedMotion ? { duration: 0 } : SPRING_CONFIG}
        drag="y"
        dragElastic={0.1}
        dragMomentum={false}
        dragConstraints={{ top: 0 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Nearby venues"
        aria-expanded={true}
        tabIndex={-1}
      >
        {/* Grabber Handle */}
        <motion.button
          onClick={handleGrabberTap}
          className={cn(
            "w-full h-12 flex items-center justify-center",
            "cursor-grab active:cursor-grabbing touch-manipulation",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset"
          )}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          aria-label="Close venues sheet"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleGrabberTap();
            }
          }}
        >
          <motion.div
            animate={{ 
              scale: isDragging ? 1.1 : 1 
            }}
            transition={prefersReducedMotion ? { duration: 0 } : { 
              type: "spring", 
              stiffness: 250, 
              damping: 20 
            }}
            className="w-8 h-1 bg-border rounded-full"
          />
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
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
                aria-label="Close venues sheet"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>

        {/* Content */}
        <div 
          className="flex-1 overflow-hidden"
          style={{ touchAction: 'auto' }}
        >
          {!hasPermission && !lat && !lng ? (
            <div className="flex items-center justify-center h-full">
              <GeolocationPrompt onRequestLocation={requestLocation} loading={locationLoading} />
            </div>
          ) : locationLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Getting your location...</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Finding nearby venues...</p>
              </div>
            </div>
          ) : allVenues.length === 0 ? (
            <div className="flex items-center justify-center h-full">
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
          ) : shouldUseVirtualization ? (
            <List
              height={400}
              width="100%"
              itemCount={allVenues.length}
              itemSize={80}
              itemData={listData}
              className="overflow-auto"
            >
              {VenueItem}
            </List>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-0">
                <AnimatePresence mode="popLayout">
                  {allVenues.map((venue) => (
                    <motion.div
                      key={venue.id}
                      layout={!prefersReducedMotion}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
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
            </ScrollArea>
          )}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="p-4 border-t border-border/40 bg-background/50"
          style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}
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
      </motion.div>

      {/* Screen reader live region */}
      <div 
        ref={liveRegionRef}
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only" 
      />
    </>
  );
}