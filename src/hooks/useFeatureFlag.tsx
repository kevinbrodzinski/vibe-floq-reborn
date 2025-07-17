export const useFeatureFlag = (flagName: string): boolean => {
  const envKey = `VITE_FLAG_${flagName.toUpperCase()}`;
  return import.meta.env[envKey] === 'true' || false;
};