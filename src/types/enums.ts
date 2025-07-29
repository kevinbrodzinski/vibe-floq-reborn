// Stub file for enum types
// TODO: Replace with actual enum definitions when available

export enum VibeEnum {
  chill = 'chill',
  social = 'social',
  energetic = 'energetic',
  focused = 'focused',
  excited = 'excited'
}

export type Vibe = VibeEnum | keyof typeof VibeEnum;