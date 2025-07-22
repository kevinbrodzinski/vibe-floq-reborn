import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { zIndex } from '@/constants/z';

export type VibeSuggestion = {
  clusterId: string;
  vibe: string;
  distanceMeters: number;
  peopleEstimate: number;
  isHot: boolean;
};

type Props = {
  suggestion: VibeSuggestion;
  onApply: (s: VibeSuggestion) => void;
  onDismiss: (clusterId: string) => void;
};

/** Slide-in toast that auto-hides after 12 s or on manual dismiss. */
const SuggestionToast = memo(({ suggestion, onApply, onDismiss }: Props) => {
  const [isVisible, setIsVisible] = useState(true);

  /* Auto-dismiss after 12 s */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(suggestion.clusterId), 300);
    }, 12_000);
    
    return () => clearTimeout(timer);
  }, [suggestion.clusterId, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(suggestion.clusterId), 300);
  };

  const handleApply = () => {
    onApply(suggestion);
    setIsVisible(false);
  };

  const headline = suggestion.isHot
    ? `🔥 ${suggestion.peopleEstimate} people vibing ${suggestion.vibe}`
    : `${suggestion.peopleEstimate} nearby on ${suggestion.vibe}`;

  const distanceText = suggestion.distanceMeters < 1000 
    ? `${Math.round(suggestion.distanceMeters)}m away`
    : `${(suggestion.distanceMeters / 1000).toFixed(1)}km away`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{
            type: "spring",
            damping: 18,
            stiffness: 170,
            opacity: { duration: 0.28 }
          }}
          {...zIndex('toast')} className="fixed bottom-6 left-4 right-4 max-w-sm mx-auto"
        >
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm leading-5">
                  {headline}
                </h3>
                <p className="text-muted-foreground text-xs mt-1">
                  {distanceText}
                </p>
              </div>
              
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                Later
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg font-medium"
              >
                Apply Vibe
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SuggestionToast.displayName = 'SuggestionToast';

export default SuggestionToast;