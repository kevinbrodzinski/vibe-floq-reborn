export interface CloseFriendsLocationSettings {
  enabled: boolean;
  accuracy_level: 'exact' | 'approximate' | 'city';
  auto_share_when: string[];
  close_friends_count: number;
  sharing_with_count: number;
  all_close_friends_sharing: boolean;
}

export interface CloseFriendsLocationPreferences {
  share_location_with_close_friends: boolean;
  close_friends_location_accuracy: 'exact' | 'approximate' | 'city';
  close_friends_auto_share_when: string[];
}

export interface EnableCloseFriendsLocationSharingResponse {
  success: boolean;
  enabled: boolean;
  close_friends_added: number;
  accuracy_level: string;
  auto_share_when: string[];
}

export interface DisableCloseFriendsLocationSharingResponse {
  success: boolean;
  enabled: boolean;
  close_friends_removed: number;
}

export interface LocationAccuracyOption {
  value: 'exact' | 'approximate' | 'city';
  label: string;
  description: string;
  icon: React.ReactNode;
}

export interface AutoShareOption {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export interface CloseFriendsLocationState {
  settings: CloseFriendsLocationSettings | null;
  isLoading: boolean;
  error: string | null;
}

// UI Component Props
export interface CloseFriendsLocationToggleProps {
  onToggle?: (enabled: boolean) => void;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

export interface CloseFriendsLocationSettingsProps {
  settings: CloseFriendsLocationSettings;
  onSettingsChange: (settings: Partial<CloseFriendsLocationPreferences>) => Promise<void>;
  className?: string;
}

export interface LocationSharingStatusProps {
  settings: CloseFriendsLocationSettings;
  className?: string;
}

// Constants
export const LOCATION_ACCURACY_OPTIONS: LocationAccuracyOption[] = [
  {
    value: 'exact',
    label: 'Exact Location',
    description: 'Share your precise GPS coordinates',
    icon: '🎯'
  },
  {
    value: 'approximate',
    label: 'Approximate Location', 
    description: 'Share your general area (within ~100m)',
    icon: '📍'
  },
  {
    value: 'city',
    label: 'City Only',
    description: 'Share only your city/neighborhood',
    icon: '🏙️'
  }
];

export const AUTO_SHARE_OPTIONS: AutoShareOption[] = [
  {
    value: 'always',
    label: 'Always',
    description: 'Share location whenever tracking is active',
    icon: '🌐'
  },
  {
    value: 'in_floq',
    label: 'In Floq Events',
    description: 'Only when participating in Floq activities',
    icon: '🎉'
  },
  {
    value: 'at_venue',
    label: 'At Venues',
    description: 'Only when at restaurants, bars, or events',
    icon: '🍽️'
  },
  {
    value: 'walking',
    label: 'While Moving',
    description: 'Only when actively walking or traveling',
    icon: '🚶'
  }
];

// Helper functions
export const getAccuracyLabel = (accuracy: string): string => {
  const option = LOCATION_ACCURACY_OPTIONS.find(opt => opt.value === accuracy);
  return option?.label || accuracy;
};

export const getAccuracyDescription = (accuracy: string): string => {
  const option = LOCATION_ACCURACY_OPTIONS.find(opt => opt.value === accuracy);
  return option?.description || '';
};

export const getAutoShareLabels = (autoWhen: string[]): string[] => {
  return autoWhen.map(value => {
    const option = AUTO_SHARE_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  });
};

export const formatLocationSharingStatus = (settings: CloseFriendsLocationSettings): string => {
  if (!settings.enabled) {
    return 'Location sharing with close friends is disabled';
  }
  
  if (settings.close_friends_count === 0) {
    return 'No close friends to share location with';
  }
  
  if (settings.all_close_friends_sharing) {
    return `Sharing ${getAccuracyLabel(settings.accuracy_level).toLowerCase()} location with all ${settings.close_friends_count} close friends`;
  }
  
  return `Sharing location with ${settings.sharing_with_count} of ${settings.close_friends_count} close friends`;
};