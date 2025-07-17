export const useFeatureFlag = (key: string) =>
  (import.meta.env[`VITE_FLAG_${key.toUpperCase()}`] ?? 'false') === 'true';