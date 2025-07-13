import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { ConstellationGestureSystem } from "@/components/ConstellationGestureSystem";

interface ConstellationControlsProps {
  timeState: string;
  constellationMode: boolean;
  onConstellationToggle: () => void;
  onConstellationAction: (action: any) => void;
  onOrbitalAdjustment: (direction: 'expand' | 'contract', intensity: number) => void;
  onEnergyShare: (fromId: string, toId: string, energy: number) => void;
}

export const ConstellationControls = ({
  timeState,
  constellationMode,
  onConstellationToggle,
  onConstellationAction,
  onOrbitalAdjustment,
  onEnergyShare
}: ConstellationControlsProps) => {
  return (
    <>
      {/* Constellation Gesture System */}
      <ConstellationGestureSystem 
        onConstellationAction={onConstellationAction}
        onOrbitalAdjustment={onOrbitalAdjustment}
        onEnergyShare={onEnergyShare}
        isActive={constellationMode}
      />

      {/* Constellation Mode Toggle */}
      {(timeState === 'evening' || timeState === 'night') && (
        <div className="absolute top-40 right-4 z-20">
          <Button
            variant={constellationMode ? "default" : "outline"}
            size="sm"
            className="bg-card/80 backdrop-blur-xl border border-border/30"
            onClick={onConstellationToggle}
          >
            <Star className="w-4 h-4 mr-2" />
            {constellationMode ? 'Field View' : 'Constellation'}
          </Button>
        </div>
      )}
    </>
  );
};