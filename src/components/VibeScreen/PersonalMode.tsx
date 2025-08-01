import React from 'react';
import { LegacyVibeScreen } from '@/components/screens/LegacyVibeScreen';

/**
 * PersonalMode - Contains all the existing vibe functionality
 * For now, this wraps the existing VibeScreen to preserve all functionality
 */
export const PersonalMode: React.FC = () => {
  return <LegacyVibeScreen />;
};