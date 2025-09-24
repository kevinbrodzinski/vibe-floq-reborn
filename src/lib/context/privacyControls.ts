import React from 'react';

/**
 * Privacy controls for Context-Aware AI system
 * Allows users to pause fact collection and analysis
 */

interface PrivacySettings {
  collectTransitions: boolean;
  runFrictionAnalysis: boolean;
  enableRouterHooks: boolean;
  collectVibeData: boolean;
}

class ContextPrivacyManager {
  private settings: PrivacySettings = {
    collectTransitions: true,
    runFrictionAnalysis: true, 
    enableRouterHooks: true,
    collectVibeData: true
  };

  private storageKey = 'context-privacy-settings-v1';

  constructor() {
    this.loadSettings();
  }

  // Get current settings
  getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  // Update a specific setting
  updateSetting<K extends keyof PrivacySettings>(
    key: K, 
    value: PrivacySettings[K]
  ): void {
    this.settings[key] = value;
    this.persistSettings();
    
    // Emit event for components to react
    window.dispatchEvent(new CustomEvent('context-privacy-changed', {
      detail: { key, value, settings: this.getSettings() }
    }));
  }

  // Bulk update settings
  updateSettings(partial: Partial<PrivacySettings>): void {
    Object.assign(this.settings, partial);
    this.persistSettings();
    
    window.dispatchEvent(new CustomEvent('context-privacy-changed', {
      detail: { settings: this.getSettings() }
    }));
  }

  // Check if a feature is enabled
  isEnabled(feature: keyof PrivacySettings): boolean {
    return this.settings[feature];
  }

  // Pause all context collection
  pauseAll(): void {
    this.updateSettings({
      collectTransitions: false,
      runFrictionAnalysis: false,
      enableRouterHooks: false,
      collectVibeData: false
    });
  }

  // Resume all context collection
  resumeAll(): void {
    this.updateSettings({
      collectTransitions: true,
      runFrictionAnalysis: true,
      enableRouterHooks: true,
      collectVibeData: true
    });
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PrivacySettings>;
        Object.assign(this.settings, parsed);
      }
    } catch {
      // Use defaults
    }
  }

  private persistSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch {
      // Fail silently
    }
  }
}

// Singleton instance
export const contextPrivacy = new ContextPrivacyManager();

/**
 * React hook for privacy settings
 */
export function useContextPrivacy() {
  const [settings, setSettings] = React.useState(contextPrivacy.getSettings());

  React.useEffect(() => {
    const handleChange = (event: CustomEvent) => {
      setSettings(contextPrivacy.getSettings());
    };

    window.addEventListener('context-privacy-changed', handleChange as EventListener);
    return () => window.removeEventListener('context-privacy-changed', handleChange as EventListener);
  }, []);

  return {
    settings,
    updateSetting: contextPrivacy.updateSetting.bind(contextPrivacy),
    updateSettings: contextPrivacy.updateSettings.bind(contextPrivacy),
    isEnabled: contextPrivacy.isEnabled.bind(contextPrivacy),
    pauseAll: contextPrivacy.pauseAll.bind(contextPrivacy),
    resumeAll: contextPrivacy.resumeAll.bind(contextPrivacy)
  };
}