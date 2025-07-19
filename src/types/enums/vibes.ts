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

export const safeVibe = (input: unknown): Vibe => {
  const parsed = VibeEnum.safeParse(input)
  return parsed.success ? parsed.data : 'chill'
}