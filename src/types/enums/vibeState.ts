export const allowedVibeStates = [
  'chill',
  'hype',
  'curious',
  'social',
  'solo',
  'romantic',
  'weird',
  'down',
  'flowing',
  'open',
] as const;

export type VibeState = (typeof allowedVibeStates)[number];

export const safeVibeState = (input: unknown): VibeState => {
  return allowedVibeStates.includes(input as VibeState) ? (input as VibeState) : 'chill';
};