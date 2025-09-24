export type StopKind = 'venue' | 'floq' | 'person' | 'activity';
export type VibeTag = 'chill' | 'wild' | 'romantic' | 'sporty' | 'artsy';

export const KIND_COLOUR: Record<StopKind, string> = {
  venue:     'from-[#6B7CFF]  to-[#48C3FF]',   // blue-purple
  floq:      'from-[#00FFD1]  to-[#6687FF]',   // aqua-indigo
  person:    'from-[#FF8D1A]  to-[#FF593D]',   // orange-red
  activity:  'from-[#FF68F0]  to-[#8E61FF]',   // magenta-violet
};

export const VIBE_COLOUR: Record<VibeTag, string> = {
  chill:     'from-[#6B7CFF]  to-[#48C3FF]',
  wild:      'from-[#FF39C9]  to-[#FF7F3F]',
  romantic:  'from-[#FF6666]  to-[#FF9999]',
  sporty:    'from-[#1DD35F]  to-[#38BDF8]',
  artsy:     'from-[#FF8D1A]  to-[#FF593D]',
};