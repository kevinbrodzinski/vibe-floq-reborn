import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronUp, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface EventBannerProps {
  eventId: string;
  eventName: string;
  vibe?: string | null;
  onDismiss: () => void;
  onTap?: () => void;
}

export const EventBanner = ({ 
  eventId, 
  eventName, 
  vibe, 
  onDismiss, 
  onTap 
}: EventBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);

  // Reset visibility when event changes
  useEffect(() => {
    setIsVisible(true);
  }, [eventId]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for exit animation
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    
    // If dragged down more than 50px, dismiss
    if (info.offset.y > 50) {
      handleDismiss();
    }
  };

  const handleTap = () => {
    if (!isDragging && onTap) {
      onTap();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={constraintsRef}
          className="fixed top-4 left-1/2 z-50 max-w-sm"
          style={{ x: '-50%' }}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 300,
            duration: 0.4
          }}
        >
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 100 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            onTap={handleTap}
            whileDrag={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer select-none"
          >
            <Card className="relative overflow-hidden border-0 shadow-xl">
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 via-indigo-500/30 to-sky-500/30 backdrop-blur-sm" />
              
              {/* Content */}
              <div className="relative p-4">
                {/* Drag Indicator */}
                <div className="flex justify-center mb-2">
                  <div className="w-8 h-1 bg-white/40 rounded-full" />
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {eventName}
                    </h3>
                    {vibe && (
                      <p className="text-xs text-white/80 capitalize">
                        {vibe} vibes
                      </p>
                    )}
                  </div>
                  
                  <ChevronUp className="w-4 h-4 text-white/60" />
                </div>
                
                {/* Swipe hint */}
                <div className="mt-2 text-center">
                  <p className="text-xs text-white/60">
                    Tap for details • Swipe down to dismiss
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};