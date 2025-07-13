import { motion } from "framer-motion";
import { FieldHeader } from "./FieldHeader";
import { FieldOverlay } from "./FieldOverlay";
import { ConstellationControls } from "./ConstellationControls";
import { SocialGestureManager } from "@/components/SocialGestureManager";
import { TimeWarpSlider } from "@/components/TimeWarpSlider";
import { TimeBasedActionCard } from "./TimeBasedActionCard";
import { Z_LAYERS } from "@/lib/z-layers";
import type { FieldData } from "./FieldDataProvider";

interface FieldUILayerProps {
  data: FieldData;
}

export const FieldUILayer = ({ data }: FieldUILayerProps) => {
  const {
    isFull,
    isLocationReady,
    location,
    lastHeartbeat,
    nearbyVenues,
    currentVibe,
    people,
    walkableFloqs,
    debug,
    timeState,
    constellationMode,
    showTimeWarp,
    setVenuesSheetOpen,
    setCurrentVibe,
    setConstellationMode,
    setShowTimeWarp,
  } = data;

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
      {/* Header - hidden in full mode */}
      <motion.div
        className="absolute top-0 left-0 right-0"
        style={{ zIndex: Z_LAYERS.FIELD_HEADER }}
        animate={{
          y: isFull ? '-100%' : 0,
          opacity: isFull ? 0 : 1
        }}
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

      {/* Field Overlay - hidden in full mode */}
      <motion.div
        className="absolute inset-0 top-12 pointer-events-none"
        style={{ 
          zIndex: Z_LAYERS.FIELD_OVERLAY,
          pointerEvents: isFull ? 'none' : 'auto'
        }}
        animate={{
          opacity: isFull ? 0 : 1
        }}
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
        >
          {/* Constellation Controls */}
          <ConstellationControls
            timeState={timeState}
            constellationMode={constellationMode}
            onConstellationToggle={() => setConstellationMode(!constellationMode)}
            onConstellationAction={handleConstellationAction}
            onOrbitalAdjustment={handleOrbitalAdjustment}
            onEnergyShare={handleEnergyShare}
          />
        </FieldOverlay>
      </motion.div>

      {/* Interactive Elements - hidden in full mode */}
      <motion.div
        className="absolute inset-0"
        style={{ 
          zIndex: Z_LAYERS.FLOATING_BUTTONS,
          pointerEvents: isFull ? 'none' : 'auto'
        }}
        animate={{
          y: isFull ? '100%' : 0,
          opacity: isFull ? 0 : 1
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
      >
        {/* Social Gesture Manager */}
        <SocialGestureManager onSocialAction={handleSocialAction} />

        {/* Time Warp Slider */}
        <TimeWarpSlider 
          isVisible={showTimeWarp}
          onClose={() => setShowTimeWarp(false)}
          onTimeChange={handleTimeWarpChange}
        />

        {/* Time-Based Bottom Action Card */}
        <TimeBasedActionCard
          className={isFull ? 'pointer-events-none opacity-0' : ''}
          timeState={timeState}
          onTimeWarpToggle={() => setShowTimeWarp(true)}
        />
      </motion.div>
    </>
  );
};