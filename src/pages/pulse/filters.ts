export type PulseFilter =
  | 'walking'
  | 'highEnergy'
  | 'socialVibes'
  | 'myFloqs';

export const WALKING_THRESHOLD_M = 800;   // ≈½ mile
export const HIGH_ENERGY_SCORE   = 25;    // tweak later 