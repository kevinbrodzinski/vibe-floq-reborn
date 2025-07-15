import { motion } from "framer-motion";
import { FieldHeader } from "./FieldHeader";
import { FieldOverlay } from "./FieldOverlay";
import { ConstellationControls } from "./ConstellationControls";
import { SocialGestureManager } from "@/components/SocialGestureManager";
import { TimeWarpSlider } from "@/components/TimeWarpSlider";
import { TimeBasedActionCard } from "./TimeBasedActionCard";
import { FriendSuggestionCarousel } from "@/components/social/FriendSuggestionCarousel";
import { SocialToastProvider } from "@/components/social/SocialToast";
import { Z } from "@/constants/zLayers";
import { useFieldLocation } from "@/components/field/contexts/FieldLocationContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import type { FieldData } from "./FieldDataProvider";

interface FieldUILayerProps {
  data: FieldData;
}

export const FieldUILayer = ({ data }: FieldUILayerProps) => {
  const { isLocationReady, location, lastHeartbeat } = useFieldLocation();
  const { people } = useFieldSocial();
  const { 
    isFull,
    currentVibe,
    debug,
    timeState,
    constellationMode,
    showTimeWarp,
    setVenuesSheetOpen,
    setCurrentVibe,
    setConstellationMode,
    setShowTimeWarp,
  } = useFieldUI();
  const { nearbyVenues, walkableFloqs } = data;

  // Event handlers
  const handleSocialAction = (action: any) => {
    switch (action.type) {
      case 'shake-pulse':
        setConstellationMode(true);
        break;
      case 'social-radar':
        setConstellationMode(!constellationMode);
        break;
      case 'quick-join':
        break;
      case 'vibe-broadcast':
        break;
    }
  };

  const handleConstellationAction = (action: any) => {
    switch (action.type) {
      case 'orbital-adjust':
        break;
      case 'constellation-create':
        break;
      case 'energy-share':
        break;
      case 'group-plan':
        break;
      case 'temporal-view':
        setShowTimeWarp(true);
        break;
    }
  };

  const handleOrbitalAdjustment = (direction: 'expand' | 'contract', intensity: number) => {
    // Orbital adjustment handled
  };

  const handleEnergyShare = (fromId: string, toId: string, energy: number) => {
    // Energy sharing handled
  };

  const handleTimeWarpChange = (hour: number, data: any) => {
    // Time warp data updated
  };

  return (
    <>
      {/* Social Toast Provider - always active */}
      <SocialToastProvider />
      
      {/* Header - hidden in full mode */}
      {!isFull && (
        <motion.div
          className="absolute top-0 left-0 right-0 pointer-events-auto"
          style={{ zIndex: Z.header }}
          initial={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        >
          <FieldHeader 
            locationReady={isLocationReady} 
            currentLocation={location.error ? "Location unavailable" : "Current location"}
            lastHeartbeat={lastHeartbeat}
            venueCount={nearbyVenues?.length || 0}
            onOpenVenues={() => setVenuesSheetOpen(true)}
          />
        </motion.div>
      )}

      {/* Field Overlay - hidden in full mode */}
      {!isFull && (
        <motion.div
          className="absolute inset-0 top-12"
          style={{ zIndex: Z.overlay }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        >
          <FieldOverlay
            isLocationReady={isLocationReady}
            currentVibe={currentVibe}
            nearbyUsersCount={people.length}
            walkableFloqsCount={walkableFloqs.length}
            updating={false}
            error={location.error}
            debug={debug}
            onVibeChange={(vibe) => setCurrentVibe(vibe)}
          />
        </motion.div>
      )}

      {/* Constellation Controls - always visible when needed */}
      {(timeState === 'evening' || timeState === 'night') && !isFull && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: Z.controls }}
        >
          <ConstellationControls
            timeState={timeState}
            constellationMode={constellationMode}
            onConstellationToggle={() => setConstellationMode(!constellationMode)}
            onConstellationAction={handleConstellationAction}
            onOrbitalAdjustment={handleOrbitalAdjustment}
            onEnergyShare={handleEnergyShare}
          />
        </div>
      )}

      {/* Interactive Elements - hidden in full mode */}
      {!isFull && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: Z.interactive }}
          initial={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        >
          {/* Social Gesture Manager */}
          <SocialGestureManager onSocialAction={handleSocialAction} />

          {/* Friend Suggestions Carousel */}
          <div className="absolute bottom-20 left-0 right-0 px-4 pointer-events-auto">
            <FriendSuggestionCarousel />
          </div>

          {/* Time Warp Slider */}
          <TimeWarpSlider 
            isVisible={showTimeWarp}
            onClose={() => setShowTimeWarp(false)}
            onTimeChange={handleTimeWarpChange}
          />

          {/* Time-Based Bottom Action Card */}
          <TimeBasedActionCard
            className="pointer-events-auto"
            timeState={timeState}
            onTimeWarpToggle={() => setShowTimeWarp(true)}
          />
        </motion.div>
      )}
    </>
  );
};