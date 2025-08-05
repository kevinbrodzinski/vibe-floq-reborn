
import { BannerManager } from "@/components/BannerManager";
import { EventDetailsSheet } from "@/components/EventDetailsSheet";
import { ResizableVenuesSheet } from "@/components/ResizableVenuesSheet";
import { VenueDetailsSheet } from "@/components/VenueDetailsSheet";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { Z, zIndex } from "@/constants/z";
import { AnimatePresence } from "framer-motion";
import type { FieldData } from "./FieldDataProvider";

interface FieldModalLayerProps {
  data: FieldData;
}

export const FieldModalLayer = ({ data }: FieldModalLayerProps) => {
  const { people } = useFieldSocial();
  const {
    detailsOpen,
    venuesSheetOpen,
    selectedVenueId,
    setDetailsOpen,
    setVenuesSheetOpen,
    setSelectedVenueId,
  } = useFieldUI();
  const { currentEvent } = data;

  return (
    <>
      {/* ——— Banners (network, beta flags, etc.) ——— */}
      <div {...zIndex('overlay')}>
        <BannerManager />
      </div>

      {/* ——— Event details ——— */}
      {currentEvent && (
        <EventDetailsSheet
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          event={{
            ...currentEvent,
            people: people.length,
          }}
        />
      )}

      {/* ——— Venues list ——— */}
      <AnimatePresence>
        {venuesSheetOpen && (
          <ResizableVenuesSheet
            isOpen={venuesSheetOpen}
            onClose={() => setVenuesSheetOpen(false)}
            onVenueTap={(venueId) => {
              setSelectedVenueId(venueId);
              setVenuesSheetOpen(false);
              if ('vibrate' in navigator) {
                navigator.vibrate(4);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ——— Venue details ——— */}
      <VenueDetailsSheet
        open={!!selectedVenueId}
        onOpenChange={(open) => !open && setSelectedVenueId(null)}
        venueId={selectedVenueId}
      />
    </>
  );
};
