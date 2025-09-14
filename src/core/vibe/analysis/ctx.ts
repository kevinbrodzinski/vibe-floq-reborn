// Context field accessors to handle shape differences across analyzers
import type { VibeCorrection } from '@/core/vibe/storage/CorrectionStore';

export const getHour = (c: VibeCorrection): number => c.context.hourOfDay ?? 0;
export const getDow = (c: VibeCorrection): number => c.context.dayOfWeek ?? 0;
export const getIsWeekend = (c: VibeCorrection): boolean => c.context.isWeekend ?? isWeekend(getDow(c));
export const getVenueType = (c: VibeCorrection): string => c.context.venue?.type ?? 'unknown';

// Clear weekend computation instead of % 6 === 0
export const isWeekend = (dow: number): boolean => (dow === 0 || dow === 6);

// Typed Boolean filter for safe mapping
export const isSome = <T>(x: T | null | undefined): x is T => x != null;