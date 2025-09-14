import { useState, useEffect } from 'react';

export interface IntelligenceFlags {
  patterns: boolean;
  venue: boolean;
  weather: boolean;
  smartSuggestions: boolean;
}

const DEFAULT_FLAGS: IntelligenceFlags = {
  patterns: true,
  venue: true,
  weather: true,
  smartSuggestions: true,
};

const STORAGE_KEY = 'intelligence_flags_v1';

/**
 * Hook to manage intelligence feature flags with persistence
 */
export function useIntelligenceFlags() {
  const [flags, setFlags] = useState<IntelligenceFlags>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('[IntelligenceFlags] Failed to load from storage:', error);
    }
    return DEFAULT_FLAGS;
  });

  // Persist changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (error) {
      console.warn('[IntelligenceFlags] Failed to save to storage:', error);
    }
  }, [flags]);

  const updateFlag = (key: keyof IntelligenceFlags, value: boolean) => {
    setFlags(prev => ({ ...prev, [key]: value }));
  };

  const resetFlags = () => {
    setFlags(DEFAULT_FLAGS);
  };

  return {
    flags,
    updateFlag,
    resetFlags,
  };
}