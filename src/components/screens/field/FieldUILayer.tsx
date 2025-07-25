import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { FieldHeader } from "./FieldHeader";
import { FieldOverlay } from "./FieldOverlay";
import { ConstellationControls } from "./ConstellationControls";
import { SocialGestureManager } from "@/components/SocialGestureManager";
import { TimeWarpSlider } from "@/components/TimeWarpSlider";
import { TimeBasedActionCard } from "./TimeBasedActionCard";
import { FriendSuggestionCarousel } from "@/components/social/FriendSuggestionCarousel";
import { SocialToastProvider } from "@/components/social/SocialToast";
import { LocationDisplay } from "@/components/LocationDisplay";
import { useFieldLocation } from "@/components/field/contexts/FieldLocationContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useLocationDisplay } from "@/hooks/useLocationDisplay";
import { Z, zIndex } from "@/constants/z";
import type { FieldData } from "./FieldDataProvider";

interface FieldUILayerProps {
  data: FieldData;
}

export const FieldUILayer = ({ data }: FieldUILayerProps) => {
  /* ——— state ——————————————————————————————————— */
  const { location, lastHeartbeat, isLocationReady } = useFieldLocation();
  const { people } = useFieldSocial();
  const {
    isFull, currentVibe, debug, timeState,
    constellationMode, showTimeWarp,
    setConstellationMode, setShowTimeWarp,
    setVenuesSheetOpen, setCurrentVibe,
  } = useFieldUI();

  const locDisp = useLocationDisplay(
    location?.lat ?? null,
    location?.lng ?? null,
    Boolean(location?.lat && location?.lng),
    location.error,
  );

  const route = useLocation().pathname;

  /* ——— helpers —————————————————————————————————— */
  const handleSocialAction = (a: any) => {
    if (a.type === "social-radar") setConstellationMode(!constellationMode);
    if (a.type === "shake-pulse") setConstellationMode(true);
  };

  const handleConstellation = (a: any) => {
    if (a.type === "temporal-view") setShowTimeWarp(true);
  };

  /* ——— render ——————————————————————————————————— */
  return (
    <>
      <SocialToastProvider />

      {/* ——— Header & Location —————————————— */}
      <AnimatePresence initial={false}>
        {!isFull && (
          <>
            {/* Header */}
            <motion.div
              key="field-header"
              {...zIndex("uiHeader")}
              className="absolute inset-x-0 top-0 pointer-events-auto"
              initial={{ y: -64, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -64, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
            >
              <FieldHeader
                venueCount={data.nearbyVenues?.length ?? 0}
                onOpenVenues={() => setVenuesSheetOpen(true)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ——— Field overlay ———————————————— */}
      {!isFull && route !== "/vibe" && (
        <motion.div
          {...zIndex("overlay")}
          className="absolute inset-0 top-12 pointer-events-none"
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

          {/* Friend suggestions */}
          <div className="absolute inset-x-0 bottom-24 px-4 pointer-events-auto">
            <FriendSuggestionCarousel />
          </div>

          {/* Bottom action card */}
          <TimeBasedActionCard
            className="pointer-events-auto"
            timeState={timeState}
            onTimeWarpToggle={() => setShowTimeWarp(true)}
          />
        </div>
      )}

      {/* ——— Time-warp slider (independent layer) — */}
      <AnimatePresence>
        {showTimeWarp && (
          <div key="timewarp" {...zIndex("timewarp")}>
            <TimeWarpSlider
              isVisible
              onClose={() => setShowTimeWarp(false)}
              onTimeChange={() => {/* future */}}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
};