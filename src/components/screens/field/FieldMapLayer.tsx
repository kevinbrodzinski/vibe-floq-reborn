import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { FieldVisualization } from "./FieldVisualization";
import { MiniMap } from "@/components/map/MiniMap";
import { ListModeContainer } from "@/components/lists/ListModeContainer";
import { Z_LAYERS } from "@/lib/z-layers";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import type { FieldData } from "./FieldDataProvider";

interface FieldMapLayerProps {
  data: FieldData;
}

export const FieldMapLayer = ({ data }: FieldMapLayerProps) => {
  const { mode, isFull, isList, constellationMode } = useFieldUI();
  const { people, friends } = useFieldSocial();
  const { floqEvents, walkableFloqs } = data;

  // Event handlers - these will be moved to gesture provider later
  const handleFriendInteraction = (friend: any, action: string) => {
    // Friend interaction handled
  };

  const handleConstellationGesture = (gesture: string, friends: any[]) => {
    // Constellation gesture handled
  };

  const handleAvatarInteraction = (interaction: any) => {
    // Avatar interaction handled
  };

  return (
    <>
      {/* Main Map Canvas */}
      <motion.div
        key="map-container"
        className={clsx(
          "fixed inset-x-0",
          isFull ? "inset-0" : "top-12 bottom-0",
          isList ? "" : ""
        )}
        style={{ zIndex: Z_LAYERS.MAP }}
        initial={false}
        animate={{
          y: isFull ? 0 : isList ? 0 : 0,
          height: isFull ? '100vh' : isList ? '35vh' : '100%'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
      >
        {(mode === 'map' || mode === 'full') && (
          <FieldVisualization
            className={clsx('absolute inset-0', isFull && 'fullscreen-map')}
            constellationMode={constellationMode}
            people={people}
            friends={friends}
            floqEvents={floqEvents}
            walkableFloqs={walkableFloqs}
            onFriendInteraction={handleFriendInteraction}
            onConstellationGesture={handleConstellationGesture}
            onAvatarInteraction={handleAvatarInteraction}
          />
        )}
      </motion.div>

      {/* List Mode Container */}
      <AnimatePresence>
        {isList && (
          <motion.div
            key="list-container"
            className="fixed inset-x-0 bottom-[var(--mobile-nav-height)] bg-background/90 backdrop-blur"
            style={{ 
              zIndex: Z_LAYERS.MODAL,
              height: '65vh'
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <ListModeContainer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini-map overlay (list mode only) */}
      {isList && (
        <div style={{ zIndex: Z_LAYERS.UI }}>
          <MiniMap
            constellationMode={constellationMode}
            people={people}
            friends={friends}
            floqEvents={floqEvents}
            walkableFloqs={walkableFloqs}
            onFriendInteraction={handleFriendInteraction}
            onConstellationGesture={handleConstellationGesture}
            onAvatarInteraction={handleAvatarInteraction}
          />
        </div>
      )}
    </>
  );
};