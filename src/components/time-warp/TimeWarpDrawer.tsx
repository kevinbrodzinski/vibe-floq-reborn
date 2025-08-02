import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTimeWarp } from "@/lib/timeWarp";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface Props { 
  open: boolean; 
  onOpenChange: (o: boolean) => void 
}

export const TimeWarpDrawer = ({ open, onOpenChange }: Props) => {
  const { t, set } = useTimeWarp();
  const [hours, setHours] = useState(
    t ? Math.round((Date.now() - t.getTime()) / 3.6e6) : 0
  );

  /** keep slider value in sync when context changes elsewhere */
  useEffect(() => {
    setHours(t ? Math.round((Date.now() - t.getTime()) / 3.6e6) : 0);
  }, [t]);

  const label = hours === 0 ? "🔴 LIVE" : `⏪ ${String(hours).padStart(2, "0")} h ago`;

  const apply = () => {
    set(hours === 0 ? undefined : new Date(Date.now() - hours * 3.6e6));
    onOpenChange(false);
  };

  const jumpToNow = () => {
    set(undefined);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-8">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 justify-center">
            <span className="text-2xl">🕒</span>
            <span className="text-lg font-semibold">Time-Warp</span>
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-6 pt-4 space-y-6">
          {/* Status display */}
          <div className="text-center">
            <div className="text-2xl font-medium mb-2">{label}</div>
            <div className="text-sm text-muted-foreground">
              Slide to explore historical data
            </div>
          </div>

          {/* Slider with tick marks */}
          <div className="space-y-4">
            <Slider
              min={0}
              max={24}
              step={1}
              value={[hours]}
              onValueChange={([v]) => setHours(v)}
              className="w-full"
            />
            
            {/* Tick labels */}
            <div className="flex justify-between text-xs text-muted-foreground px-2">
              <span>Now</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>24h</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={jumpToNow}
              className="flex-1 max-w-32"
            >
              Jump to NOW
            </Button>
            <Button 
              onClick={apply}
              className="flex-1 max-w-32"
            >
              Apply
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};