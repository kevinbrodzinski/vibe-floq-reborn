import React from 'react'
import { vibeToBorder } from '@/utils/vibeColors'

interface VenueEnergy {
  total_people: number
  energy_score: number
  dominant_vibe: string
  vibe_distribution: Record<string, number>
  venue_id: string
}

interface VenueEnergyIndicatorProps {
  energy: VenueEnergy
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
}

export const VenueEnergyIndicator: React.FC<VenueEnergyIndicatorProps> = ({
  energy,
  size = 'md',
  showDetails = false
}) => {
  const getEnergyColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getEnergyIcon = (score: number) => {
    if (score >= 80) return '🔥'
    if (score >= 60) return '⚡'
    if (score >= 40) return '💫'
    return '💤'
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const borderClass = energy?.dominant_vibe ? vibeToBorder(energy.dominant_vibe as any) : 'border-gray-500'

  return (
    <div className={`flex items-center gap-2 p-2 rounded-full bg-card/80 border ${borderClass} backdrop-blur-sm`}>
      <span className={`${sizeClasses[size]} ${getEnergyColor(energy.energy_score)}`}>
        {getEnergyIcon(energy.energy_score)}
      </span>
      {showDetails && (
        <span className={`${sizeClasses[size]} text-white/80`}>
          {energy.total_people} people • {energy.dominant_vibe}
        </span>
      )}
    </div>
  )
} 