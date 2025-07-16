import { MapPin, Users, Music, CalendarCheck, Sparkles, Eye } from "lucide-react"

// Color palette for chips to avoid Tailwind purge issues
export const CHIP_COLOR_PALETTE: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-800 dark:text-pink-200',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-200',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200',
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