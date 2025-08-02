import { Clock4, CircleDot } from "lucide-react";
import { useTimeWarp } from "@/lib/timeWarp";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TimeWarpDrawer } from "./TimeWarpDrawer";

export const TimeWarpFab = () => {
  const { t, set } = useTimeWarp();
  const [open, setOpen] = useState(false);

  const isLive = !t;
  const toggle = () => (isLive ? setOpen(true) : set(undefined));

  return (
    <>
      <button
        onClick={toggle}
        className={cn(
          "fixed bottom-[90px] right-5 z-[65] h-12 w-12 flex items-center",
          "justify-center rounded-full shadow-lg transition-colors",
          isLive
            ? "bg-primary text-primary-foreground"
            : "bg-destructive text-destructive-foreground"
        )}
        aria-label={isLive ? "Open time-warp" : "Back to live"}
      >
        {isLive ? <Clock4 className="h-5 w-5" /> : <CircleDot className="h-5 w-5" />}
      </button>

      <TimeWarpDrawer open={open} onOpenChange={setOpen} />
    </>
  );
};