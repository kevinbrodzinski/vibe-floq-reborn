import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Users } from "lucide-react";
import { useDrag } from "@use-gesture/react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { vibeEmoji } from "@/utils/vibe";
import { PlaceBanner } from "@/hooks/usePlaceBanners";
import { zIndex } from "@/constants/z";

interface Props {
  banner: PlaceBanner;
  onDetails: () => void;
  onDismiss: () => void;
}

/** 📍 production-ready, animated event banner  */
export const EventBanner = ({
  banner,
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
          key={banner.id}
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { duration: 0.3 } }}
          exit={{ y: 96, opacity: 0, transition: { duration: 0.2 } }}
          role="button"
          aria-label="Open event details"
          aria-live="polite"
          onClick={onDetails}
          style={zIndex('overlay')}
          className={clsx(
            "fixed bottom-24 left-1/2 -translate-x-1/2",
            "w-[92%] max-w-lg px-4 py-3",
            "rounded-xl border border-white/10 shadow-lg backdrop-blur-sm",
            "bg-gradient-to-r from-violet-500/90 via-indigo-500/90 to-sky-500/90",
            "animate-pulse"
          )}
        >
          {/* Header with emoji and title */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📍</span>
            <h2 className="flex-1 text-lg font-bold text-white truncate">{banner.headline}</h2>
            <div className="flex items-center gap-2">
              {banner.metadata?.live_count && banner.metadata.live_count > 0 && (
                <Badge className="bg-white/10 text-white border-white/20 gap-1">
                  <Users size={12} />
                  {banner.metadata.live_count}
                </Badge>
              )}
              <button
                aria-label="Dismiss banner"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="text-white/70 hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Call to action */}
          <div className="flex items-center gap-2 text-xs text-white/80">
            <MapPin size={14} />
            <span>Tap to {banner.cta_type === 'join' ? 'join' : 'see details'}</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};