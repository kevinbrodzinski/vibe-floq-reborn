
import { useEffect, useState } from "react";
import { MapPin, Users, Info, Navigation, Plus, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useVenueDetails } from "@/hooks/useVenueDetails";
import { useEnhancedVenueDetails } from "@/hooks/useEnhancedVenueDetails";
import { vibeEmoji } from "@/utils/vibe";
import { useVenueJoin } from "@/hooks/useVenueJoin";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useUserSettings } from "@/hooks/useUserSettings";
import { CreateFloqSheet } from "@/components/CreateFloqSheet";
import { VenueSocialPortal } from "@/components/VenueSocialPortal";

interface VenueDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string | null;
}

export function VenueDetailsSheet({ open, onOpenChange, venueId }: VenueDetailsSheetProps) {
  const { data: venue, isLoading, error } = useVenueDetails(venueId);
  const { data: socialData } = useEnhancedVenueDetails(venueId);
  const { lat, lng } = useGeolocation();
  const { settings } = useUserSettings();
  const { join, joinPending, leave, leavePending } =
    useVenueJoin(venue?.id ?? null, lat, lng);
  const [createFloqOpen, setCreateFloqOpen] = useState(false);
  const [useSocialPortal, setUseSocialPortal] = useState(false);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (open) {
        onOpenChange(false);
      }
    };

    if (open) {
      window.addEventListener("popstate", handlePopState);
      window.history.pushState(null, "", window.location.href);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open, onOpenChange]);

  const handleDirections = () => {
    if (venue) {
      const url = `https://maps.google.com/maps?daddr=${venue.lat},${venue.lng}`;
      window.open(url, "_blank");
    }
  };

  const handleJoin = async () => {
    try {
      await join({ vibeOverride: venue?.vibe });
    } catch (error) {
      console.error("Failed to join venue:", error);
    }
  };

  const handleLeave = async () => {
    try {
      await leave();
    } catch (error) {
      console.error("Failed to leave venue:", error);
    }
  };

  // Use social portal based on user preference or crowd size
  const shouldUseSocialPortal = 
    settings?.privacy_settings?.always_immersive_venues ||
    useSocialPortal ||
    (socialData && socialData.people_count >= 0); // Temporarily lowered for testing

  if (shouldUseSocialPortal) {
    return (
      <VenueSocialPortal 
        open={open} 
        onOpenChange={onOpenChange} 
        venueId={venueId} 
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <SheetTitle>Venue Not Found</SheetTitle>
              <SheetDescription>
                We couldn't load the venue details. Please try again.
              </SheetDescription>
            </div>
          ) : venue ? (
            <>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <SheetTitle className="text-xl font-semibold flex items-center gap-2">
                    <span className="text-2xl">{vibeEmoji(venue.vibe)}</span>
                    {venue.name}
                  </SheetTitle>
                  {venue.vibe && (
                    <Badge variant="secondary" className="capitalize">
                      {venue.vibe}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{venue.live_count} here now</span>
                  </div>
                  {venue.live_count > 3 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUseSocialPortal(true)}
                      className="h-6 px-2 text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Social View
                    </Button>
                  )}
                </div>
              </div>

              {venue.description && (
                <SheetDescription className="text-left">
                  {venue.description}
                </SheetDescription>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{venue.lat.toFixed(6)}, {venue.lng.toFixed(6)}</span>
              </div>
            </>
          ) : null}
        </SheetHeader>

        {venue && (
          <div className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="flex items-center gap-2"
                disabled={joinPending || leavePending}
                onClick={handleJoin}
              >
                <Users className="h-4 w-4" />
                {joinPending ? "Joining…" : "Join venue"}
              </Button>
              {venue.live_count > 0 && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex items-center gap-2"
                  disabled={leavePending || joinPending}
                  onClick={handleLeave}
                >
                  <Users className="h-4 w-4" />
                  {leavePending ? "Leaving…" : "Leave"}
                </Button>
              )}
              
              <Button 
                onClick={() => setCreateFloqOpen(true)}
                size="lg" 
                className="flex items-center gap-2 col-span-2"
              >
                <Plus className="h-4 w-4" />
                Create Floq Here
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="flex items-center gap-2 col-span-2"
                onClick={handleDirections}
              >
                <Navigation className="h-4 w-4" />
                Get Directions
              </Button>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Live count updates:</span>
                  <span>Every minute</span>
                </div>
                {venue.live_count > 0 && (
                  <div className="flex justify-between">
                    <span>Active users:</span>
                    <span>{venue.live_count} within radius</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Floq Sheet */}
        <CreateFloqSheet 
          open={createFloqOpen} 
          onOpenChange={setCreateFloqOpen}
          preselectedVenueId={venue?.id}
        />
      </SheetContent>
    </Sheet>
  );
}
