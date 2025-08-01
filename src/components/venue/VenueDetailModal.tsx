import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useFavorites } from '@/hooks/useFavorites';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { useVenueActions } from '@/hooks/useVenueActions';
import { useAuth } from '@/providers/AuthProvider';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { HeroSection } from './HeroSection';
import { StatsRow } from './StatsRow';
import { IntelBlock } from './IntelBlock';
import { ActionBar } from './ActionBar';
import { RecentActivity } from './RecentActivity';
import { VenueModalErrorBoundary } from './VenueModalErrorBoundary';

interface VenueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: string | null;
}

interface EnhancedIntel {
  socialTexture?: { moodDescription: string };
  dominantVibe?: string;
  recentPosts?: Array<{
    text_content: string;
    vibe: string;
    profiles: {
      display_name?: string;
      username: string;
    };
  }>;
}

function toEnhanced(details: any): EnhancedIntel {
  return {
    socialTexture: details?.social_texture ? { moodDescription: details.social_texture.moodDescription } : undefined,
    dominantVibe: details?.dominant_vibe ?? undefined,
    recentPosts: details?.recent_posts ?? [],
  };
}

export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({
  isOpen,
  onClose,
  venueId
}) => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();
  const { view } = useVenueInteractions();
  const venueActions = useVenueActions();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const redirectedRef = React.useRef(false);
  const queryClient = useQueryClient();

  // Parallel queries for better performance
  const [
    { data: venueDetails, isLoading: venueLoading },
    { data: rawIntel, isLoading: intelLoading }
  ] = useQueries({
    queries: [
      {
        queryKey: ['venue', venueId],
        queryFn: () => fetch(`/api/venues/${venueId}`).then(r => r.json()),
        enabled: !!venueId,
      },
      {
        queryKey: ['intel', venueId],
        queryFn: () => fetch(`/api/venues/${venueId}/intel`).then(r => r.json()),
        enabled: !!venueId,
      },
    ],
  });

  const isLoading = venueLoading || intelLoading;
  const enhancedDetails = rawIntel ? toEnhanced(rawIntel) : null;

  // Track view interaction when modal opens - GUARD against invalid venueId
  React.useEffect(() => {
    if (isOpen && venueId?.length && typeof venueId === 'string') {
      view(venueId);
    }
  }, [isOpen, venueId, view]);

  // Optimistic favorite toggle with race condition protection
  const handleFavoriteToggle = useCallback(async () => {
    if (!venueId || !user || isToggling) return;
    
    await toggleFavorite({
      itemId: venueId,
      itemType: 'venue',
      title: venueDetails?.name || 'Venue',
      description: venueDetails?.description || '',
      imageUrl: undefined,
    });

    // Invalidate queries to sync favorite state
    queryClient.invalidateQueries({ queryKey: ['venue', venueId] });
    queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
  }, [venueId, user, isToggling, toggleFavorite, venueDetails, queryClient]);

  // Defensive modal close with slight delay to prevent race conditions
  const handleClose = useCallback(() => {
    // Small delay prevents instant mount/unmount cycles that trigger ResizeObserver errors
    setTimeout(() => onClose(), 16); // One frame delay
  }, [onClose]);

  // Responsive behavior: mobile gets bottom sheet, desktop gets routed page
  React.useEffect(() => {
    if (!isOpen || !venueId || isMobile || redirectedRef.current) return;

    redirectedRef.current = true;
    // Wait one animation frame so ResizeObserver cleanup finishes
    requestAnimationFrame(() => {
      navigate(`/venues/${venueId}`, { replace: true });
      onClose();
    });
  }, [isOpen, venueId, isMobile, navigate, onClose]);

  if (!venueId) return null;

  // Only render modal on mobile
  if (!isMobile) return null;

  return (
    <VenueModalErrorBoundary onClose={onClose}>
      <AnimatePresence>
        {isOpen && (
          <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="fixed bottom-0 left-0 right-0 z-[81] p-0 max-w-none max-h-[90vh] border-0 bg-background rounded-t-xl overflow-y-auto data-[state=open]:animate-slide-in-bottom data-[state=closed]:animate-slide-out-bottom">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/30">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="p-2 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {venueDetails && (
                    <div>
                      <h1 className="text-lg font-semibold truncate max-w-48">{venueDetails.name}</h1>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{venueDetails.live_count} here now</span>
                        <span>•</span>
                        <span>{venueDetails.vibe_score}% vibe</span>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavoriteToggle}
                  disabled={isToggling || !user}
                  className="p-2 h-8 w-8"
                >
                  <Heart className={cn("h-4 w-4", isFavorite(venueId) && "fill-red-500 text-red-500")} />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : venueDetails ? (
                <div className="p-4 space-y-6">
                  <HeroSection venue={venueDetails} />
                  <StatsRow venue={venueDetails} />
                  {enhancedDetails && <IntelBlock intel={enhancedDetails} />}
                  <ActionBar 
                    venue={venueDetails}
                    actions={venueActions}
                    isInteracting={false}
                  />
                  {enhancedDetails?.recentPosts && (
                    <RecentActivity posts={enhancedDetails.recentPosts} />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">Venue not found</p>
                </div>
              )}
            </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </VenueModalErrorBoundary>
  );
};