import { useMemo } from 'react';

// Utility function for use outside React components
export const getFeatureFlag = (key: string) =>
  (import.meta.env[`VITE_FLAG_${key.toUpperCase()}`] ?? 'false') === 'true';

// Hook version for use in React components
export const useFeatureFlag = (key: string) =>
  useMemo(() => getFeatureFlag(key), [key]);