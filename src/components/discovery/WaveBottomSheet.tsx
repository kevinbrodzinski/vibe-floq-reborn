import React from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Users, MapPin, Waves, Loader2 } from 'lucide-react';
import { NearestVenueSheet } from './NearestVenueSheet';

export type WaveBottomSheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wave: { id: string; size: number; friends: number; lat: number; lng: number } | null;
  onLetsFloq?: (payload: { venueId?: string; name?: string; lat: number; lng: number }) => void;
  isCreating?: boolean;
  maxDistanceM?: number;
};

export default function WaveBottomSheet({ 
  open, 
  onOpenChange, 
  wave, 
  onLetsFloq,
  isCreating = false,
  maxDistanceM = 200
}: WaveBottomSheetProps) {
  if (!wave) return null;

  // First show wave info, then transition to venue lookup
  const [showVenueSheet, setShowVenueSheet] = React.useState(false);

  const handleContinue = () => {
    setShowVenueSheet(true);
  };

  const handleVenueLetsFloq = (payload: { venueId?: string; name?: string; lat: number; lng: number }) => {
    onLetsFloq?.(payload);
    setShowVenueSheet(false);
  };

  // Reset venue sheet when main sheet closes
  React.useEffect(() => {
    if (!open) {
      setShowVenueSheet(false);
    }
  }, [open]);

  return (
    <>
      {/* Wave Info Sheet */}
      <Drawer open={open && !showVenueSheet} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-primary" />
              Wave Activity
            </DrawerTitle>
            <DrawerDescription>
              People are gathering in this area
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 space-y-4">
            {/* Wave Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{wave.size} people</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {wave.friends} friends
                </Badge>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{wave.lat.toFixed(4)}, {wave.lng.toFixed(4)}</span>
            </div>

            <Separator />

            {/* Description */}
            <div className="text-sm text-muted-foreground">
              Start a momentary floq to connect with people in this wave. 
              We'll find the perfect venue nearby.
            </div>
          </div>

          <DrawerFooter>
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>
              <Button onClick={handleContinue} className="flex-1">
                Continue
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Venue Lookup Sheet */}
      <NearestVenueSheet
        open={showVenueSheet}
        onOpenChange={setShowVenueSheet}
        coords={wave ? { lat: wave.lat, lng: wave.lng } : null}
        maxDistanceM={maxDistanceM}
        onLetsFloq={handleVenueLetsFloq}
      />
    </>
  );
}