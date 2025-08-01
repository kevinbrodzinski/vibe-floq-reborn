import React from 'react';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PersonalMode } from '@/components/VibeScreen/PersonalMode';
import { SocialMode } from '@/components/VibeScreen/SocialMode';
import { useVibeScreenMode } from '@/hooks/useVibeScreenMode';

/**
 * VibeScreen – unified screen that toggles between Personal & Social modes.
 * Personal mode contains all existing vibe functionality (auto-detection, wheel, etc.)
 * Social mode will contain friend matching, density map preview, suggestions
 */
export const VibeScreen: React.FC = () => {
  const { mode, setMode } = useVibeScreenMode();

  return (
    <div className="flex-1 bg-gradient-to-b from-background to-secondary/20">
      {/* Mode Toggle */}
      <div className="pt-4 px-4">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={setMode}
          className="w-full bg-card/40 backdrop-blur-sm rounded-full border border-border/30"
        >
          <ToggleGroupItem
            value="personal"
            className={cn(
              'flex-1 text-center py-2 rounded-full transition-all duration-300',
              mode === 'personal' && 'bg-primary/20 text-primary font-semibold border-primary/30'
            )}
          >
            Personal
          </ToggleGroupItem>
          <ToggleGroupItem
            value="social"
            className={cn(
              'flex-1 text-center py-2 rounded-full transition-all duration-300',
              mode === 'social' && 'bg-primary/20 text-primary font-semibold border-primary/30'
            )}
          >
            Social
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Mode Content */}
      {mode === 'personal' ? <PersonalMode /> : <SocialMode />}
    </div>
  );
};