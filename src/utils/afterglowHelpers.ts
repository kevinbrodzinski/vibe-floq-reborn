// Helper functions for afterglow data processing and display

export function formatMomentTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  })
}

export function getVibeDisplayName(vibe: string): string {
  const vibeMap: Record<string, string> = {
    'excited': 'Excited',
    'chill': 'Chill',
    'focused': 'Focused',
    'creative': 'Creative',
    'social': 'Social',
    'adventurous': 'Adventurous',
    'contemplative': 'Contemplative'
  }
  return vibeMap[vibe] || vibe.charAt(0).toUpperCase() + vibe.slice(1)
}

export function getMomentTypeIcon(momentType: string): string {
  const iconMap: Record<string, string> = {
    'venue_checkin': '📍',
    'floq_join': '🌟',
    'plan_start': '📅',
    'vibe_change': '💫'
  }
  return iconMap[momentType] || '✨'
}

export function generateEnergyGradient(energyScore: number): string {
  if (energyScore > 80) return 'from-primary to-accent'
  if (energyScore > 60) return 'from-secondary to-primary'
  if (energyScore > 40) return 'from-muted to-secondary'
  return 'from-background to-muted'
}

export function getSocialIntensityColor(intensity: number): string {
  if (intensity > 80) return 'hsl(var(--primary))'
  if (intensity > 60) return 'hsl(var(--accent))'
  if (intensity > 40) return 'hsl(var(--secondary))'
  return 'hsl(var(--muted))'
}