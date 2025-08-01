import React from 'react';
import { Platform } from 'react-native';
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
  const lastHapticTime = React.useRef(0);

  const handleModeChange = async (value: 'personal' | 'social') => {
    setMode(value);
    
    // Throttled haptic feedback - native only
    if (Platform.OS !== 'web') {
      const now = Date.now();
      if (now - lastHapticTime.current > 200) {
        lastHapticTime.current = now;
        try {
          // Dynamic import so the module never loads on web
          const { selectionAsync } = await import('expo-haptics');
          await selectionAsync();
        } catch (error) {
          // Silently fail on rare devices
        }
      }
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-background to-secondary/20">
      {/* Mode Toggle */}
      <div className="pt-4 px-4">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={handleModeChange}
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