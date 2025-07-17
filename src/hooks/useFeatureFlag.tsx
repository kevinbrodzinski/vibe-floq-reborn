import { useMemo } from 'react';

export const useFeatureFlag = (key: string) =>
  useMemo(
    () => (import.meta.env[`VITE_FLAG_${key.toUpperCase()}`] ?? 'false') === 'true',
    [key]
  );