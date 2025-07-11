import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PlaceBanner } from '@/hooks/usePlaceBanners';

interface BannerContextType {
  // Session tracking - prevent showing same banner multiple times
  dismissedBannerIds: Set<string>;
  activeBanner: PlaceBanner | null;
  
  // Actions
  dismissBanner: (bannerId: string) => void;
  setActiveBanner: (banner: PlaceBanner | null) => void;
  shouldShowBanner: (banner: PlaceBanner) => boolean;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export function BannerProvider({ children }: { children: ReactNode }) {
  const [dismissedBannerIds, setDismissedBannerIds] = useState(new Set<string>());
  const [activeBanner, setActiveBanner] = useState<PlaceBanner | null>(null);

  const dismissBanner = useCallback((bannerId: string) => {
    setDismissedBannerIds(prev => new Set([...prev, bannerId]));
    
    // If dismissing the currently active banner, clear it
    if (activeBanner?.id === bannerId) {
      setActiveBanner(null);
    }
  }, [activeBanner]);

  const shouldShowBanner = useCallback((banner: PlaceBanner) => {
    // Don't show if already dismissed this session
    if (dismissedBannerIds.has(banner.id)) {
      return false;
    }
    
    // Don't show if expired
    if (new Date(banner.expires_at) <= new Date()) {
      return false;
    }
    
    // Don't show if another banner is already active
    if (activeBanner && activeBanner.id !== banner.id) {
      return false;
    }
    
    return true;
  }, [dismissedBannerIds, activeBanner]);

  const value = {
    dismissedBannerIds,
    activeBanner,
    dismissBanner,
    setActiveBanner,
    shouldShowBanner,
  };

  return (
    <BannerContext.Provider value={value}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBannerContext() {
  const context = useContext(BannerContext);
  if (context === undefined) {
    throw new Error('useBannerContext must be used within a BannerProvider');
  }
  return context;
}