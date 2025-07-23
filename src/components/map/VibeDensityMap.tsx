
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { VibeDensityWebMap } from '@/components/maps/VibeDensityWebMap';
import { useFieldViewport } from '@/hooks/useFieldViewport';

interface VibeDensityMapProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VibeDensityMap: React.FC<VibeDensityMapProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { onRegionChange } = useFieldViewport();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] p-0 rounded-t-2xl"
      >
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Vibe Density Map</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 relative">
          <VibeDensityWebMap onRegionChange={onRegionChange}>
            {/* Map layers and overlays will be rendered here */}
          </VibeDensityWebMap>
        </div>
      </SheetContent>
    </Sheet>
  );
};
