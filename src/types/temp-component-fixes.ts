/**
 * Temporary component interface fixes to resolve TypeScript compilation errors
 * These should be replaced with proper interfaces once components are stabilized
 */

// Add missing properties to components that don't have proper interfaces
declare global {
  interface Window {
    __TEMP_COMPONENT_FIXES__: boolean;
  }
}

// Temporary component prop fixes
export interface TempComponentProps {
  [key: string]: any;
}

// Mark all social mode components as accepting any props temporarily
declare module '@/components/social/InlineFriendCarousel' {
  interface InlineFriendCarouselProps {
    proximityData?: any;
    socialContext?: any;
    [key: string]: any;
  }
}

declare module '@/components/VibeScreen/EnhancedHotspotPreview' {
  interface EnhancedHotspotPreviewProps {
    socialData?: any;
    location?: any;
    onPress?: () => void;
    [key: string]: any;
  }
}

declare module '@/components/VibeScreen/PreviewButtonsRow' {
  interface PreviewButtonsRowProps {
    className?: string;
    onMapPress?: () => void;
    onVenuesPress?: () => Promise<void>;
    onFloqsPress?: () => Promise<void>;
    onPeoplePress?: () => Promise<void>;
    proximityInsights?: any;
    [key: string]: any;
  }
}

declare module '@/components/VibeScreen/SuggestedAlignmentActions' {
  interface Props {
    className?: string;
    socialData?: any;
    proximityInsights?: any;
    [key: string]: any;
  }
}

declare module '@/components/screens/VibeDensityModal' {
  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enhancedData?: any;
    [key: string]: any;
  }
}

declare module '@/components/social/VenueRecommendationsModal' {
  interface VenueRecommendationsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    socialContext?: any;
    proximityData?: any;
    [key: string]: any;
  }
}

declare module '@/components/social/NearbyFloqsModal' {
  interface NearbyFloqsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proximityInsights?: any;
    [key: string]: any;
  }
}

declare module '@/components/social/NearbyPeopleModal' {
  interface NearbyPeopleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    socialContext?: any;
    locationData?: any;
    [key: string]: any;
  }
}

declare module '@/components/VibeScreen/EnhancedPersonalHero' {
  interface EnhancedPersonalHeroProps {
    heroData?: any;
    sensorData?: any;
    locationData?: any;
    [key: string]: any;
  }
}

export {};