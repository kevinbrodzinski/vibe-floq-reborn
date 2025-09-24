// COMPATIBILITY LAYER: Use unified vibe system from "@/lib/vibe/color"
// Temporary re-exports for migration

import { vibeToHex } from './color';
import { safeVibe } from '@/lib/vibes';

// Legacy vibe resolver functions - simplified implementations
export function resolveVibeColor(input: { vibeHex?: string; vibeKey?: string; venueId?: string; venueName?: string }): string {
  if (input.vibeHex) return input.vibeHex;
  if (input.vibeKey) return vibeToHex(safeVibe(input.vibeKey));
  return vibeToHex('chill'); // fallback
}

export const resolveVibeHex = resolveVibeColor;

// User vibe hex management
let userVibeHex = '#4C92FF';
export function setUserVibeHex(hex: string) { userVibeHex = hex; }
export function getUserVibeHex(): string { return userVibeHex; }

// Preview functionality (simplified)
let previewEnabled = false;
let previewColor = '#EC4899';
export function enableVibePreview(on: boolean) { previewEnabled = on; }
export function cycleVibePreview() { previewColor = previewColor === '#EC4899' ? '#8B5CF6' : '#EC4899'; }
export function isVibePreviewEnabled(): boolean { return previewEnabled; }
export function getVibePreviewColor(): string { return previewColor; }