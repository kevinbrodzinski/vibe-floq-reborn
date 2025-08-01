import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getVibeIcon } from '@/utils/vibeIcons';
import { getVibeColor } from '@/utils/getVibeColor';
import { cn } from '@/lib/utils';

interface TimelineEntry {
  time: string;
  vibe: string;
  duration: string;
}

interface TimelineCarouselProps {
  onVibeSelect?: (vibe: string) => void;
}

export const TimelineCarousel: React.FC<TimelineCarouselProps> = ({ onVibeSelect }) => {
  // Mock timeline data - in real app, this would come from a hook
  const timelineEntries: TimelineEntry[] = [
    { time: '7 AM', vibe: 'chill', duration: '2h' },
    { time: '9 AM', vibe: 'flowing', duration: '3h' },
    { time: '12 PM', vibe: 'social', duration: '2h' },
    { time: '2 PM', vibe: 'focused', duration: '4h' },
    { time: '6 PM', vibe: 'hype', duration: '2h' },
    { time: '8 PM', vibe: 'chill', duration: 'now' },
  ];

  const handleChipClick = (vibe: string) => {
    if (onVibeSelect) {
      onVibeSelect(vibe);
    }
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-foreground">Today's Vibe Journey</h3>
        <span className="text-xs text-muted-foreground">Tap to jump</span>
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2" style={{ width: 'max-content' }}>
          {timelineEntries.map((entry, index) => (
            <motion.button
              key={`${entry.time}-${entry.vibe}`}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all",
                "bg-card/40 backdrop-blur-sm border-border/30",
                "hover:bg-card/60 hover:scale-105 active:scale-95"
              )}
              style={{
                borderColor: getVibeColor(entry.vibe) + '40',
              }}
              onClick={() => handleChipClick(entry.vibe)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-sm">{getVibeIcon(entry.vibe)}</span>
              <div className="text-left">
                <div className="text-xs font-medium text-foreground">
                  {entry.time}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {entry.vibe} • {entry.duration}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};