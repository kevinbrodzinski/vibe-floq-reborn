export const VibeEnum = [
  'chill', 'hype', 'curious', 'social', 'solo',
  'romantic', 'weird', 'down', 'flowing', 'open',
] as const;

export type Vibe = typeof VibeEnum[number];

export enum MotionVibe {
  Idle = 'idle',
  Walking = 'walking',
  Running = 'running',
  Cycling = 'cycling',
  Vehicle = 'vehicle',
}