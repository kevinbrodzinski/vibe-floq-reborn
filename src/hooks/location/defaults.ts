/**
 * Default values for location-related types to prevent repetition
 */
import type { MovementContext } from '@/lib/location/types';

export const EMPTY_MOVEMENT: MovementContext = {
  speed: 0,
  heading: null,
  isStationary: true,
  isWalking: false,
  isDriving: false,
  confidence: 1,
  lastUpdated: Date.now(),
};

export const createDefaultMovement = (overrides: Partial<MovementContext> = {}): MovementContext => ({
  ...EMPTY_MOVEMENT,
  ...overrides,
  lastUpdated: Date.now()
});