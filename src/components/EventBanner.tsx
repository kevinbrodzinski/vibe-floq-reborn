import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useDrag } from "@use-gesture/react";
import clsx from "clsx";

interface Props {
  eventId: string;
  name: string;
  vibe?: string | null;
  onDetails: () => void;
  onDismiss: () => void;
}

/** 📍 production-ready, animated event banner  */
export const EventBanner = ({
  eventId,
  name,
  vibe,
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
            "w-[92%] max-w-lg px-4 py-3 flex items-center gap-3",
            "rounded-xl border border-white/10 shadow-sm backdrop-blur-sm",
            "bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500/80"
          )}
        >
        <MapPin size={18} className="shrink-0 text-white/90" />

        <p className="flex-1 text-sm font-medium text-white">
          {name}
          {vibe && (
            <>
              {" "}
              · <span className="capitalize">{vibe} vibes</span>
            </>
          )}
        </p>

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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};