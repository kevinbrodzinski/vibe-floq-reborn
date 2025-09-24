import { create } from 'zustand';
import { useLiveSettings } from '@/hooks/useLiveSettings';

type PrivacyMode = 'off' | 'recs-only' | 'precise';

interface PrivacyState {
  mode: PrivacyMode;
  setMode: (m: PrivacyMode) => void;
}

// Convert live settings to privacy mode for backward compatibility
const mapLiveSettingsToPrivacyMode = (liveSettings: any): PrivacyMode => {
  if (!liveSettings) return 'off';
  
  // If ghost mode is active, privacy is off
  if (liveSettings.live_muted_until && new Date(liveSettings.live_muted_until) > new Date()) {
    return 'off';
  }
  
  // If scope is none, privacy is off
  if (liveSettings.live_scope === 'none') {
    return 'off';
  }
  
  // If accuracy is area/street, it's recs-only; if exact, it's precise
  if (liveSettings.live_accuracy === 'exact') {
    return 'precise';
  } else if (liveSettings.live_accuracy === 'street' || liveSettings.live_accuracy === 'area') {
    return 'recs-only';
  }
  
  return 'recs-only'; // default fallback
};

export const usePrivacy = create<PrivacyState>()((set) => ({
  mode: 'recs-only', // default fallback
  setMode: (m) => set({ mode: m }),
}));

// Hook that reads from live settings instead of environment
export const useUnifiedPrivacy = () => {
  const { data: liveSettings } = useLiveSettings();
  
  return {
    mode: mapLiveSettingsToPrivacyMode(liveSettings),
    isGhostMode: liveSettings?.live_muted_until && new Date(liveSettings.live_muted_until) > new Date(),
    scope: liveSettings?.live_scope || 'friends',
    accuracy: liveSettings?.live_accuracy || 'exact',
    autoWhen: liveSettings?.live_auto_when || ['always'],
  };
};