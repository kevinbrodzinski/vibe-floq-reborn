import { useState, useEffect, useRef } from 'react';
import type { TimerId } from '@/types/Timer';
import { EventBanner } from '@/components/EventBanner';
import { EventModal } from '@/components/EventModal';
import { usePlaceBanners } from '@/hooks/usePlaceBanners';
import { useBannerContext } from '@/providers/BannerProvider';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';

/**
 * BannerManager - Orchestrates the place-aware banner system
 * Handles banner display logic, auto-dismiss, and modal integration
 */
export const BannerManager = () => {
  const { coords } = useUnifiedLocation({
    hookId: 'BannerManager',
    enableTracking: false,
    enablePresence: false
  });
  const lat = coords?.lat;
  const lng = coords?.lng;
  const { banners } = usePlaceBanners(lat || undefined, lng || undefined);
  const { 
    activeBanner, 
    setActiveBanner, 
    shouldShowBanner, 
    dismissBanner 
  } = useBannerContext();
  
  const [modalOpen, setModalOpen] = useState(false);
  const autoDismissTimer = useRef<TimerId | null>(null);

  // Auto-show first eligible banner
  useEffect(() => {
    if (!activeBanner && banners.length > 0) {
      const eligibleBanner = banners.find(shouldShowBanner);
      if (eligibleBanner) {
        setActiveBanner(eligibleBanner);
        
        // Auto-dismiss after 30 seconds
        const timer = setTimeout(() => {
          dismissBanner(eligibleBanner.id);
        }, 30_000);
        autoDismissTimer.current = timer;
      }
    }
  }, [banners, activeBanner, shouldShowBanner, setActiveBanner, dismissBanner]);

  // Clear timer on cleanup
  useEffect(() => {
    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, []);

  const handleOpenModal = () => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
    setModalOpen(true);
  };

  const handleDismissBanner = () => {
    if (activeBanner) {
      dismissBanner(activeBanner.id);
    }
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open && activeBanner) {
      // Dismiss banner when modal closes
      dismissBanner(activeBanner.id);
    }
  };

  // Don't render anything if no active banner or banner shouldn't show
  if (!activeBanner || !shouldShowBanner(activeBanner)) {
    return null;
  }

  return (
    <>
      <EventBanner
        banner={activeBanner}
        onDetails={handleOpenModal}
        onDismiss={handleDismissBanner}
      />
      
      <EventModal
        banner={activeBanner}
        open={modalOpen}
        onOpenChange={handleModalClose}
      />
    </>
  );
};