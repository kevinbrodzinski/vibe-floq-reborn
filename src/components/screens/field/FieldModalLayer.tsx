import { BannerManager } from "@/components/BannerManager";
import { EventDetailsSheet } from "@/components/EventDetailsSheet";
import { ResizableVenuesSheet } from "@/components/ResizableVenuesSheet";
import { VenueDetailsSheet } from "@/components/VenueDetailsSheet";
import { Z_LAYERS } from "@/lib/z-layers";
import type { FieldData } from "./FieldDataProvider";

interface FieldModalLayerProps {
  data: FieldData;
}

export const FieldModalLayer = ({ data }: FieldModalLayerProps) => {
  const {
    currentEvent,
    people,
    detailsOpen,
    venuesSheetOpen,
    selectedVenueId,
    setDetailsOpen,
    setVenuesSheetOpen,
    setSelectedVenueId,
  } = data;

  return (
    <>
      {/* Banner System */}
      <div style={{ zIndex: Z_LAYERS.UI }}>
        <BannerManager />
      </div>

      {/* Event Details Sheet */}
      {currentEvent && (
        <div style={{ zIndex: Z_LAYERS.MODAL }}>
          <EventDetailsSheet
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            event={{
              ...currentEvent,
              people: people.length,
            }}
          />
        </div>
      )}

      {/* Venues Sheet */}
      <div style={{ zIndex: Z_LAYERS.MODAL }}>
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
      </div>

      {/* Venue Details Sheet */}
      <div style={{ zIndex: Z_LAYERS.MODAL }}>
        <VenueDetailsSheet
          open={!!selectedVenueId}
          onOpenChange={(open) => !open && setSelectedVenueId(null)}
          venueId={selectedVenueId}
        />
      </div>
    </>
  );
};