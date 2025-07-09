import { useEffect } from "react";
import { MapPin, Users, Info, Navigation } from "lucide-react";
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

const getVibeEmoji = (vibe: string | null | undefined): string => {
  switch (vibe?.toLowerCase()) {
    case "chill": return "😌";
    case "hype": return "🔥";
    case "curious": return "🤔";
    case "social": return "👫";
    case "solo": return "🧘";
    case "romantic": return "💕";
    case "weird": return "🤪";
    case "down": return "😔";
    case "flowing": return "🌊";
    case "open": return "🌟";
    default: return "📍";
  }
};

interface VenueDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string | null;
}

export function VenueDetailsSheet({ open, onOpenChange, venueId }: VenueDetailsSheetProps) {
  const { data: venue, isLoading, error } = useVenueDetails(venueId);

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
                    <span className="text-2xl">{getVibeEmoji(venue.vibe)}</span>
                    {venue.name}
                  </SheetTitle>
                  {venue.vibe && (
                    <Badge variant="secondary" className="capitalize">
                      {venue.vibe}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{venue.live_count} here now</span>
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
                onClick={() => {
                  // TODO: Implement join venue logic
                  console.log("Join venue:", venue.id);
                }}
              >
                <Users className="h-4 w-4" />
                Join Venue
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="flex items-center gap-2"
                onClick={handleDirections}
              >
                <Navigation className="h-4 w-4" />
                Directions
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
      </SheetContent>
    </Sheet>
  );
}