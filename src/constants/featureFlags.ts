// Feature Flags for Safe Rollouts
// Project: reztyrrafsmlvvlqvsqt

import React from 'react';

export const FEATURE_FLAGS = {
  // Database Migration Flags
  NEW_PROFILE_SYSTEM: process.env.NODE_ENV === 'production' ? false : true,
  USE_PROFILE_ID: process.env.NODE_ENV === 'production' ? false : true,
  
  // UI/UX Feature Flags
  ENHANCED_PROFILE_UI: true,
  NEW_FRIEND_SYSTEM: true,
  IMPROVED_PLANNING: true,
  
  // Performance Flags
  OPTIMIZED_QUERIES: true,
  CACHING_ENABLED: true,
  
  // Development Flags
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  SHOW_PERFORMANCE_METRICS: process.env.NODE_ENV === 'development',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// Helper function to check if a feature is enabled
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

// Helper function to conditionally render components
export function withFeatureFlag<T extends React.ComponentType<any>>(
  Component: T,
  flag: FeatureFlag,
  FallbackComponent?: React.ComponentType<any>
) {
  return function FeatureFlaggedComponent(props: React.ComponentProps<T>) {
    if (isFeatureEnabled(flag)) {
      return React.createElement(Component, props);
    }
    
    if (FallbackComponent) {
      return React.createElement(FallbackComponent, props);
    }
    
    return null;
  };
}

// Helper for conditional logic
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return isFeatureEnabled(flag);
}

// Helper for analytics tracking
export function trackFeatureUsage(flag: FeatureFlag, context?: Record<string, any>) {
  if (isFeatureEnabled(flag)) {
    // Track feature usage
    console.log(`Feature used: ${flag}`, context);
    // Add your analytics tracking here
  }
} 