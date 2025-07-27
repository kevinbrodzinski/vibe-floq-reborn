import { VibeEnum } from './vibeEnum';

export type Vibe = typeof VibeEnum[number];

export const isValidVibe = (v: unknown): v is Vibe =>
  typeof v === 'string' && (VibeEnum as readonly string[]).includes(v);