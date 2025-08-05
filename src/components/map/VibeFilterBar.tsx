import React from 'react';
import { Vibe, ALL_VIBES, VibeFilterState, VibeFilterHelpers } from '@/hooks/useVibeFilter';

interface Props {
  state: VibeFilterState;
  helpers: VibeFilterHelpers;
}

export const VibeFilterBar: React.FC<Props> = ({ state, helpers }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {ALL_VIBES.map(v => (
          <button
            key={v}
            onClick={() => helpers.toggle(v)}
            className={`text-sm capitalize px-3 py-2 rounded-lg border transition-all
                        ${state[v] 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={helpers.reset}
          className="flex-1 text-sm text-muted-foreground hover:text-foreground 
                     py-2 px-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
        >
          Reset all
        </button>
        <button
          onClick={() => helpers.setAll(false)}
          className="flex-1 text-sm text-muted-foreground hover:text-foreground 
                     py-2 px-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* active count */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
        {helpers.activeSet.size} of {ALL_VIBES.length} vibes active
      </div>
    </div>
  );
};