import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useDrag } from "@use-gesture/react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { vibeEmoji } from "@/utils/vibe";

interface Props {
  eventId: string;
  name: string;
  vibe?: string | null;
  liveCount?: number;
  aiSummary?: string;
  onDetails: () => void;
  onDismiss: () => void;
}

/** 📍 production-ready, animated event banner  */
export const EventBanner = ({
  eventId,
  name,
  vibe,
  liveCount,
  aiSummary,
  onDetails,
  onDismiss,
}: Props) => {
  /* swipe-down → dismiss */
  const bind = useDrag(
    ({ movement: [, y], last }) => {
      if (last && y > 60) onDismiss();
    },
    { filterTaps: true }
  );

  return (
    <AnimatePresence>
      <div {...bind()}>
        <motion.div
          key={eventId}
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { duration: 0.3 } }}
          exit={{ y: 96, opacity: 0, transition: { duration: 0.2 } }}
          role="button"
          aria-label="Open event details"
          onClick={onDetails}
          className={clsx(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-30",
            "w-[92%] max-w-lg px-4 py-3",
            "rounded-xl border border-white/10 shadow-sm backdrop-blur-sm",
            "bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500/80"
          )}
        >
          {/* Header with emoji and title */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{vibeEmoji(vibe)}</span>
            <h2 className="flex-1 text-lg font-bold text-white">{name}</h2>
            {liveCount && liveCount > 0 && (
              <Badge className="bg-white/10 text-white border-white/20">
                {liveCount} people here
              </Badge>
            )}
            <button
              aria-label="Dismiss banner"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-white/70 hover:text-white transition-opacity"
            >
              <X size={16} />
            </button>
          </div>

          {/* AI Summary */}
          <p className="text-sm text-white/80 mb-2">
            {aiSummary ?? 'Loading vibe…'}
          </p>

          {/* Location indicator */}
          <div className="flex items-center gap-2 text-xs text-white/60">
            <MapPin size={14} />
            <span>Tap to see details</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};