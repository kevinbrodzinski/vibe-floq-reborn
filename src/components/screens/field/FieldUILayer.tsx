import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

import { FieldOverlay } from "./FieldOverlay";
import { ConstellationControls } from "./ConstellationControls";
import { SocialGestureManager } from "@/components/SocialGestureManager";
import { useSocialWeather } from "@/components/field/contexts/SocialWeatherContext";
// import { WaveDiscoveryOverlay } from "@/components/field/WaveDiscoveryOverlay"; // Removed - using dedicated /discover page

import { TimeBasedActionCard } from "./TimeBasedActionCard";
import { FriendSuggestionCarousel } from "@/components/social/FriendSuggestionCarousel";
import { SocialToastProvider } from "@/components/social/SocialToast";
import { LocationDisplay } from "@/components/LocationDisplay";
import { useFieldLocation } from "@/components/field/contexts/FieldLocationContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useFieldLens } from "@/components/field/FieldLensProvider";
import { useLocationDisplay } from "@/hooks/useLocationDisplay";
import { Z, zIndex } from "@/constants/z";
import type { FieldData } from "./FieldDataProvider";
import { ExploreDrawer } from "@/components/field/ExploreDrawer";

interface FieldUILayerProps {
  data: FieldData;
}

export const FieldUILayer = ({ data }: FieldUILayerProps) => {
  /* ——— state ——————————————————————————————————— */
  const { location, lastHeartbeat, isLocationReady } = useFieldLocation();
  const { people } = useFieldSocial();
  const { phrase: socialWeatherPhrase } = useSocialWeather();
  const { lens } = useFieldLens();
  const {
    isFull, currentVibe, debug, timeState,
    constellationMode,
    setConstellationMode,
    setVenuesSheetOpen, setCurrentVibe,
  } = useFieldUI();

  const locDisp = useLocationDisplay(
    location?.coords?.lat ?? null,
    location?.coords?.lng ?? null,
    Boolean(location?.coords?.lat && location?.coords?.lng),
    location.error,
  );

  const route = useLocation().pathname;

  /* ——— helpers —————————————————————————————————— */
  const handleSocialAction = (a: any) => {
    if (a.type === "social-radar") setConstellationMode(!constellationMode);
    if (a.type === "shake-pulse") setConstellationMode(true);
  };

  const handleConstellation = (a: any) => {
    // Handle constellation actions
  };

  /* ——— render ——————————————————————————————————— */
  return (
    <>
      <SocialToastProvider />

      {/* ——— Header now handled by universal AppHeader —————————————— */}

      {/* ——— Field overlay ———————————————— */}
      {!isFull && route !== "/vibe" && (
        <motion.div
          {...zIndex("overlay")}
          className="absolute inset-0 top-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FieldOverlay
            isLocationReady={isLocationReady}
            currentVibe={currentVibe}
            nearbyUsersCount={people.length}
            walkableFloqsCount={data.walkableFloqs.length}
            updating={false}
            error={location.error}
            debug={debug}
            onVibeChange={setCurrentVibe}
            socialWeatherPhrase={socialWeatherPhrase}
          />
        </motion.div>
      )}

      {/* ——— Constellation controls ——————————— */}
      {(timeState === "evening" || timeState === "night") && !isFull && (
        <div className="absolute inset-0 pointer-events-none" {...zIndex("uiControls")}>
          <ConstellationControls
            timeState={timeState}
            constellationMode={constellationMode}
            onConstellationToggle={() => setConstellationMode(!constellationMode)}
            onConstellationAction={handleConstellation}
            onOrbitalAdjustment={() => {/* TODO */}}
            onEnergyShare={() => {/* TODO */}}
          />
        </div>
      )}

      {/* ——— Interactive layer (gestures, cards) —— */}
      {!isFull && (
        <div className="absolute inset-0 pointer-events-none" {...zIndex("uiInteractive")}>
          <SocialGestureManager onSocialAction={handleSocialAction} />

          {/* Wave Discovery moved to dedicated /discover page */}

          {/* Friend suggestions */}
          <div className="absolute inset-x-0 bottom-20 px-4 pointer-events-auto">
            <FriendSuggestionCarousel />
          </div>

          {/* Bottom action card */}
          <TimeBasedActionCard
            className="pointer-events-auto"
            timeState={timeState}
          />
        </div>
      )}

      {/* ——— Lens-aware UI ——————————————————————— */}
      {!isFull && (
        <>
          {/* Explore Mode */}
          {lens === 'explore' && data.nearbyVenues && (
            <ExploreDrawer
              venues={data.nearbyVenues}
              onJoin={(pid) => {
                console.log('Join venue:', pid);
                // TODO: Implement join flow
              }}
              onSave={(pid) => {
                console.log('Save venue:', pid);
                // TODO: Implement save to favorites
              }}
              onPlan={(pid) => {
                console.log('Plan at venue:', pid);
                // TODO: Implement planning flow
              }}
              onChangeVenue={(pid) => {
                console.log('Change venue:', pid);
                setVenuesSheetOpen(true);
              }}
            />
          )}

          {/* Constellation Mode */}
          {lens === 'constellation' && (
            <div className="fixed inset-0 z-[550] pointer-events-none">
              {/* TODO: Add ConstellationCanvas and ConstellationController */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-black/60 backdrop-blur text-white/80 text-sm pointer-events-auto">
                Constellation mode active
              </div>
            </div>
          )}

          {/* Temporal Mode */}
          {lens === 'temporal' && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[580] pointer-events-auto">
              {/* TODO: Add TemporalController */}
              <div className="px-4 py-2 rounded-lg bg-black/60 backdrop-blur text-white/80 text-sm">
                Temporal mode active
              </div>
            </div>
          )}
        </>
      )}

    </>
  );
};