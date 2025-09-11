import { MapPin, Users, Music, CalendarCheck, Sparkles, Eye } from "lucide-react"

// Color palette for chips to avoid Tailwind purge issues
export const CHIP_COLOR_PALETTE: Record<string, string> = {
  slate: 'bg-slate-900/30 text-slate-50 border border-slate-50/10',
  red: 'bg-red-500/15 text-red-50 border border-red-400/25',
  blue: 'bg-blue-500/15 text-blue-50 border border-blue-400/25',
  green: 'bg-green-500/15 text-green-50 border border-green-400/25',
  yellow: 'bg-yellow-500/15 text-yellow-50 border border-yellow-400/25',
  purple: 'bg-purple-500/15 text-purple-50 border border-purple-400/25',
  pink: 'bg-pink-500/15 text-pink-50 border border-pink-400/25',
  teal: 'bg-teal-500/15 text-teal-50 border border-teal-400/25',
  emerald: 'bg-emerald-500/15 text-emerald-50 border border-emerald-400/25',
  indigo: 'bg-indigo-500/15 text-indigo-50 border border-indigo-400/25',
  cyan: 'bg-cyan-500/15 text-cyan-50 border border-cyan-400/25',
  orange: 'bg-orange-500/15 text-orange-50 border border-orange-400/25',
}

// Icon mapping for moment types
export const MOMENT_ICONS = {
  venue_checkin: MapPin,
  floq_join: Users,
  plan_start: CalendarCheck,
  music: Music,
  vibe_change: Sparkles,
  default: Eye,
} as const

// Hex color to semantic color mapping
export const HEX_TO_COLOR_MAP: Record<string, string> = {
  '#ff6b6b': 'red',
  '#4ecdc4': 'teal', 
  '#45b7d1': 'blue',
  '#96ceb4': 'green',
  '#ffeaa7': 'yellow',
  '#fd79a8': 'pink',
  '#a29bfe': 'purple'
}

// Realtime event types
export const REALTIME_EVENTS = {
  AFTERGLOW_PROGRESS: 'afterglow_progress',
} as const

// Helper functions
export const getMomentIcon = (type: string) => {
  return MOMENT_ICONS[type as keyof typeof MOMENT_ICONS] || MOMENT_ICONS.default
}

export const getColorFromHex = (hex?: string): string => {
  if (!hex) return 'slate'
  return HEX_TO_COLOR_MAP[hex] || 'slate'
}

export const formatMomentType = (type: string): string => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}