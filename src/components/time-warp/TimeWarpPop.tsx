import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeWarp } from "@/lib/timeWarp";
import { Clock4, CircleDot } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const PANEL_H = 86;

export const TimeWarpPop = () => {
  const { t, set } = useTimeWarp();
  const isLive = !t;
  const [open, setOpen] = useState(false);

  // slider value in hours ago
  const value = t ? Math.round((Date.now() - t.getTime()) / 3.6e6) : 0;

  /** Apply on every drag – smooth scrubbing */
  const onSlide = ([hrs]: number[]) =>
    set(hrs === 0 ? undefined : new Date(Date.now() - hrs * 3.6e6));

  /** Close when we jump back to live */
  useEffect(() => { if (isLive) setOpen(false); }, [isLive]);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => (isLive ? setOpen((o) => !o) : set(undefined))}
        className={cn(
          "fixed bottom-[90px] right-5 z-[70] h-11 w-11 flex items-center justify-center rounded-full shadow-lg transition-colors",
          isLive
            ? "bg-primary text-primary-foreground"
            : "bg-destructive text-destructive-foreground"
        )}
        aria-label={isLive ? "Open time-warp" : "Back to live"}
      >
        {isLive ? <Clock4 className="h-5 w-5" /> : <CircleDot className="h-5 w-5" />}
      </button>

      {/* Mini-panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="tw-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-[96px] z-[69]
                       w-[92%] max-w-md h-[86px] rounded-2xl bg-background/90
                       backdrop-blur-md shadow-lg border border-border/20 px-5 py-3"
          >
            <Slider
              min={0}
              max={24}
              step={1}
              value={[value]}
              onValueChange={onSlide}
              className="mb-2"
            />
            <div className="text-center text-sm mt-2 select-none">
              {value === 0 ? (
                <span className="text-green-500 font-medium">🔴 LIVE</span>
              ) : (
                <span className="text-muted-foreground">
                  ⏪ {String(value).padStart(2, "0")}:00 ago
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};