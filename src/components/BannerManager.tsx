import { useState, useEffect } from 'react';
import { EventBanner } from '@/components/EventBanner';
import { EventModal } from '@/components/EventModal';
import { usePlaceBanners } from '@/hooks/usePlaceBanners';
import { useBannerContext } from '@/providers/BannerProvider';
import { useGeolocation } from '@/hooks/useGeolocation';

/**
 * BannerManager - Orchestrates the place-aware banner system
 * Handles banner display logic, auto-dismiss, and modal integration
 */
export const BannerManager = () => {
  const { lat, lng } = useGeolocation();
  const { banners } = usePlaceBanners(lat || undefined, lng || undefined);
  const { 
    activeBanner, 
    setActiveBanner, 
    shouldShowBanner, 
    dismissBanner 
  } = useBannerContext();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [autoDismissTimer, setAutoDismissTimer] = useState<NodeJS.Timeout | null>(null);

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
        setAutoDismissTimer(timer);
      }
    }
  }, [banners, activeBanner, shouldShowBanner, setActiveBanner, dismissBanner]);

  // Clear timer when banner changes
  useEffect(() => {
    return () => {
      if (autoDismissTimer) {
        clearTimeout(autoDismissTimer);
      }
    };
  }, [autoDismissTimer]);

  const handleOpenModal = () => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      setAutoDismissTimer(null);
    }
    setModalOpen(true);
  };

  const handleDismissBanner = () => {
    if (activeBanner) {
      dismissBanner(activeBanner.id);
    }
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      setAutoDismissTimer(null);
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