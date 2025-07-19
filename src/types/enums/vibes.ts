import { z } from 'zod'

export const VibeEnum = z.enum([
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
])

export type Vibe = z.infer<typeof VibeEnum>

// For VibeState compatibility with existing code (removes 'curious')
export const VibeStateEnum = z.enum([
  'chill',
  'hype',
  'social',
  'solo', 
  'romantic',
  'weird',
  'down',
  'flowing',
  'open',
])

export type VibeState = z.infer<typeof VibeStateEnum>

export const safeVibe = (input: unknown): Vibe => {
  const parsed = VibeEnum.safeParse(input)
  return parsed.success ? parsed.data : 'chill'
}

export const safeVibeState = (input: unknown): VibeState => {
  const parsed = VibeStateEnum.safeParse(input)
  return parsed.success ? parsed.data : 'chill'
}