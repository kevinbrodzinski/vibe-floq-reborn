import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PlaceBanner } from '@/hooks/usePlaceBanners';
import { VenueDetails, useVenueDetails } from '@/hooks/useVenueDetails';
import { vibeEmoji } from '@/utils/vibe';
import { useBannerContext } from '@/providers/BannerProvider';
import { useToast } from '@/hooks/use-toast';

interface EventModalProps {
  banner: PlaceBanner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventModal = ({ banner, open, onOpenChange }: EventModalProps) => {
  const { dismissBanner } = useBannerContext();
  const { data: venue, isLoading } = useVenueDetails(banner?.venue_id || null);
  const { toast } = useToast();

  // Track banner view analytics
  useEffect(() => {
    if (open && banner) {
      // Analytics: banner viewed (production ready)
    }
  }, [open, banner]);
  
  const handleClose = () => {
    if (banner) {
      dismissBanner(banner.id);
    }
    onOpenChange(false);
  };

  const handleJoinVenue = async () => {
    if (!banner || !venue) return;
    
    try {
      // Analytics: CTA clicked (production ready)
      
      // TODO: Implement venue join logic
      
      // Close modal after successful join
      handleClose();
      
      // TODO: Push achievement event
      // pushAchievementEvent('venue_checkin', { venue_id: venue.id });
    } catch (error) {
      console.error('Failed to join venue:', error);
    }
  };

  const handleShowRoute = () => {
    // Analytics: Route CTA clicked (production ready)
    
    // Feature not yet implemented - show notification
    toast({
      title: "Coming Soon",
      description: "Route navigation feature is currently in development.",
    });
    handleClose();
  };

  if (!banner) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full max-w-lg" side="bottom">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative"
        >
          {/* Hero Image Section */}
          <div className="relative h-64 bg-gradient-to-br from-violet-600 to-indigo-700">
            {venue?.vibe && (
              <div className="absolute inset-0 bg-black/40" />
            )}
            
            {/* Venue info overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{vibeEmoji(venue?.vibe)}</span>
                {venue?.live_count && venue.live_count > 0 && (
                  <div className="px-2 py-1 rounded-full bg-white/20 backdrop-blur">
                    <span className="text-xs font-medium text-white">
                      {venue.live_count} here now
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/20 backdrop-blur
                         text-white hover:bg-black/40 transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Section */}
          <div className="p-6 space-y-4">
            {/* Venue Name & Description */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {venue?.name || 'Loading...'}
              </h2>
              {venue?.description && (
                <p className="text-muted-foreground mt-1">{venue.description}</p>
              )}
            </div>

            {/* Banner Headline */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">{banner.headline}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {banner.cta_type === 'join' && (
                <Button
                  className="w-full h-12 text-base font-medium
                           bg-gradient-to-r from-violet-600 to-indigo-600
                           hover:from-violet-700 hover:to-indigo-700
                           shadow-lg"
                  onClick={handleJoinVenue}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : "I'm coming"}
                </Button>
              )}

              {(banner.cta_type === 'route' || banner.cta_type === 'join') && (
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2"
                  onClick={handleShowRoute}
                  disabled={isLoading}
                >
                  <Navigation size={16} />
                  Show route
                </Button>
              )}
            </div>

            {/* Venue Details */}
            {venue && (
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} />
                  <span>
                    {venue.lat.toFixed(6)}, {venue.lng.toFixed(6)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
};