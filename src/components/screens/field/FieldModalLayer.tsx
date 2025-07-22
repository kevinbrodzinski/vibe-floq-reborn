
import { BannerManager } from "@/components/BannerManager";
import { EventDetailsSheet } from "@/components/EventDetailsSheet";
import { ResizableVenuesSheet } from "@/components/ResizableVenuesSheet";
import { VenueDetailsSheet } from "@/components/VenueDetailsSheet";
import { Z } from "@/constants/z";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
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
      {/* Banner System */}
      <div style={{ zIndex: Z.overlay }}>
        <BannerManager />
      </div>

      {/* Event Details Sheet */}
      {currentEvent && (
        <div style={{ zIndex: Z.modal }}>
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
      <div style={{ zIndex: Z.modal }}>
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
      <div style={{ zIndex: Z.modal }}>
        <VenueDetailsSheet
          open={!!selectedVenueId}
          onOpenChange={(open) => !open && setSelectedVenueId(null)}
          venueId={selectedVenueId}
        />
      </div>
    </>
  );
};
