import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Waves } from 'lucide-react';
import { fetchNearestVenue } from '@/lib/nearestVenue';

export type NearestVenueSheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coords: { lat: number; lng: number } | null;
  maxDistanceM?: number; // default 200
  onLetsFloq: (payload: { venueId?: string; name?: string; lat: number; lng: number }) => void;
};

export function NearestVenueSheet({ 
  open, 
  onOpenChange, 
  coords, 
  maxDistanceM = 200, 
  onLetsFloq 
}: NearestVenueSheetProps) {
  const enabled = open && !!coords;
  
  const { data: venue, isLoading, isFetching, error } = useQuery({
    queryKey: ['nearestVenue', coords?.lat, coords?.lng, maxDistanceM],
    queryFn: async () => {
      if (!coords) return null;
      return await fetchNearestVenue({ 
        lat: coords.lat, 
        lng: coords.lng, 
        maxDistanceM 
      });
    },
    enabled,
    staleTime: 15_000,
  });

  const title = useMemo(() => {
    if (isLoading || isFetching) return 'Finding the nearest spot…';
    if (venue) return venue.name;
    if (error) return 'No venue found nearby';
    return 'Here looks good';
  }, [isLoading, isFetching, venue, error]);

  const handleCTA = () => {
    if (!coords) return;
    onLetsFloq({
      venueId: venue?.venue_id,
      name: venue?.name ?? undefined,
      lat: venue?.lat ?? coords.lat,
      lng: venue?.lng ?? coords.lng,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {title}
            {venue?.distance_m != null && (
              <Badge variant="secondary" className="ml-2">{venue.distance_m} m</Badge>
            )}
          </DrawerTitle>
          <DrawerDescription>
            {venue ? 'Perfect spot for a momentary floq' : 'Start a floq at this location'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          {isLoading || isFetching ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking nearby venues…
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">
              Could not look up nearby venues. You can still start here.
            </p>
          ) : null}

          {venue && !isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Waves className="w-4 h-4" />
              <span>Great spot for gathering people</span>
            </div>
          )}
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </DrawerClose>
            <Button 
              onClick={handleCTA} 
              size="lg" 
              className="flex-1"
              aria-label={venue ? `Start floq at ${venue.name}` : 'Start floq here'}
            >
              {venue ? `Let's Floq at ${venue.name}` : "Let's Floq here"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}