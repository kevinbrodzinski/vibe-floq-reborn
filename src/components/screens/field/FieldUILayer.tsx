import { motion, AnimatePresence } from "framer-motion";
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

import { Z } from "@/constants/z";
import { useFieldLocation } from "@/components/field/contexts/FieldLocationContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useLocationDisplay } from "@/hooks/useLocationDisplay";
import type { FieldData } from "./FieldDataProvider";

/* ------------------------------------------------------------------ */

interface FieldUILayerProps {
  data: FieldData;
}

export const FieldUILayer = ({ data }: FieldUILayerProps) => {
  /* ---------- state from providers ---------- */
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

  const locationDisplay = useLocationDisplay(
    location?.lat ?? null,
    location?.lng ?? null,
    Boolean(location.lat && location.lng),
    location.error,
  );

  const { nearbyVenues, walkableFloqs } = data;
  const route = useLocation().pathname;

  /* ---------- handlers ---------- */
  const handleSocialAction = (action: any) => {
    switch (action.type) {
      case "social-radar":
        setConstellationMode(!constellationMode);
        break;
      case "shake-pulse":
        setConstellationMode(true);
        break;
      case "quick-join":
        // TODO: implement quick join
        break;
      case "vibe-broadcast":
        // TODO: implement vibe broadcast
        break;
    }
  };

  const handleConstellationAction = (action: any) => {
    switch (action.type) {
      case "temporal-view":
        setShowTimeWarp(true);
        break;
      case "orbital-adjust":
        // TODO: implement orbital adjustment
        break;
      case "constellation-create":
        // TODO: implement constellation creation
        break;
      case "energy-share":
        // TODO: implement energy sharing
        break;
      case "group-plan":
        // TODO: implement group planning
        break;
    }
  };

  const handleOrbitalAdjustment = (direction: 'expand' | 'contract', intensity: number) => {
    // TODO: implement orbital adjustment
  };

  const handleEnergyShare = (fromId: string, toId: string, energy: number) => {
    // TODO: implement energy sharing
  };

  const handleTimeWarpChange = (hour: number, data: any) => {
    // TODO: implement time warp data handling
  };

  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* global social toasts */}
      <SocialToastProvider />

      {/* ---------- header & location ---------- */}
      <AnimatePresence initial={false}>
        {!isFull && (
          <>
            {/* header bar */}
            <motion.div
              key="field-header"
              className="absolute inset-x-0 top-0 pointer-events-auto"
              style={{ zIndex: Z.uiHeader }}
              initial={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <FieldHeader
                venueCount={nearbyVenues?.length ?? 0}
                onOpenVenues={() => setVenuesSheetOpen(true)}
              />
            </motion.div>

            {/* location strip */}
            <motion.div
              key="location-display"
              className="absolute top-16 inset-x-0 px-6 pt-2 pointer-events-auto"
              style={{ zIndex: Z.uiHeader }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              <LocationDisplay
                locationText={locationDisplay.displayText}
                isReady={locationDisplay.isReady}
                isLoading={locationDisplay.isLoading}
                lastHeartbeat={lastHeartbeat}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------- field overlay ---------- */}
      {!isFull && route !== "/vibe" && (
        <motion.div
          className="absolute inset-0 top-12"
          style={{ zIndex: Z.overlay }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          <FieldOverlay
            isLocationReady={isLocationReady}
            currentVibe={currentVibe}
            nearbyUsersCount={people.length}
            walkableFloqsCount={walkableFloqs.length}
            updating={false}
            error={location.error}
            debug={debug}
            onVibeChange={setCurrentVibe}
          />
        </motion.div>
      )}

      {/* ---------- controls (constellation, gestures, etc.) ---------- */}
      {(timeState === "evening" || timeState === "night") && !isFull && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: Z.uiControls }}
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

      {/* ---------- interactive layer (carousel, time warp, action card) ---------- */}
      <AnimatePresence initial={false}>
        {!isFull && (
          <motion.div
            key="ui-interactive"
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: Z.uiInteractive }}
            initial={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            {/* gesture manager (full-screen invisible) */}
            <SocialGestureManager onSocialAction={handleSocialAction} />

            {/* friend suggestions */}
            <div className="absolute bottom-20 inset-x-0 px-4 pointer-events-auto">
              <FriendSuggestionCarousel />
            </div>

            {/* time-warp slider */}
            <div
              className="pointer-events-auto"
              style={{ zIndex: Z.timewarp }}
            >
              <TimeWarpSlider
                isVisible={showTimeWarp}
                onClose={() => setShowTimeWarp(false)}
                onTimeChange={handleTimeWarpChange}
              />
            </div>

            {/* bottom action card */}
            <TimeBasedActionCard
              className="pointer-events-auto"
              timeState={timeState}
              onTimeWarpToggle={() => setShowTimeWarp(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};