import React from 'react';
import { motion } from 'framer-motion';
import { Vibe, ALL_VIBES } from '@/hooks/useVibeFilter';
import { useVibeFilter } from '@/hooks/useVibeFilter';

export const VibeFilterBar: React.FC = () => {
  const [state, helpers] = useVibeFilter();

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      exit={{   y: -10, opacity: 0 }}
      transition={{ duration: .25 }}
      className="absolute top-0 left-1/2 -translate-x-1/2 z-[5]
                 flex gap-2 bg-background/90 backdrop-blur-sm
                 border border-border/40 rounded-full px-3 py-2"
    >
      {ALL_VIBES.map(v => (
        <button
          key={v}
          onClick={() => helpers.toggle(v)}
          className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full
                      transition-colors
                      ${state[v] ? 'bg-primary text-background'
                                  : 'bg-muted text-muted-foreground'}`}
        >
          {v}
        </button>
      ))}

      {/* quick-clear */}
      {helpers.isFiltered && (
        <button
          onClick={helpers.reset}
          className="ml-1 text-xs text-muted-foreground hover:text-foreground"
        >
          reset
        </button>
      )}
    </motion.div>
  );
};