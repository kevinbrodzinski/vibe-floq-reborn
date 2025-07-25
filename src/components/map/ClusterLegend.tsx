import { useMemo } from 'react'
import { scaleSequential } from 'd3-scale'
import type { Cluster } from '@/hooks/useClusters'

// Turbo colormap approximation
const interpolateTurbo = (t: number): string => {
  const r = Math.round(255 * Math.min(1, Math.max(0, 4 * t - 1.5)))
  const g = Math.round(255 * Math.min(1, Math.max(0, -2 * Math.abs(t - 0.5) + 1)))
  const b = Math.round(255 * Math.min(1, Math.max(0, -4 * t + 2.5)))
  return `rgb(${r}, ${g}, ${b})`
}

interface Props {
  clusters: Cluster[]
  className?: string
}

export const ClusterLegend = ({ clusters, className = '' }: Props) => {
  const { maxTotal, gradientStops } = useMemo(() => {
    const maxTotal = Math.max(...clusters.map((c) => c.member_count || c.total || 1), 1)
    const colorScale = scaleSequential((t: number) => interpolateTurbo(t)).domain([0, 1])
    
    // Create gradient stops
    const stops = []
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      stops.push(`${colorScale(t)} ${t * 100}%`)
    }
    
    return { maxTotal, gradientStops: stops }
  }, [clusters])

  if (clusters.length === 0) {
    return null
  }

  return (
    <div className={`bg-background/90 backdrop-blur-sm rounded-lg p-3 border ${className}`}>
      <h3 className="text-sm font-medium mb-2 text-foreground">Vibe Density</h3>
      
      {/* Gradient bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">1</span>
        <div 
          className="w-24 h-3 rounded"
          style={{
            background: `linear-gradient(to right, ${gradientStops.join(', ')})`
          }}
        />
        <span className="text-xs text-muted-foreground">{maxTotal}</span>
      </div>
      
      <p className="text-xs text-muted-foreground mt-1">
        People in area
      </p>
    </div>
  )
}