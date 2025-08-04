import { Badge } from '@/components/ui/badge'
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation'

export function LocationStatusChip() {
  const { isTracking, status, error } = useUnifiedLocation({
    enableTracking: true,
    enablePresence: false,
    hookId: 'location-status-chip'
  })
  const loading = status === 'loading'

  if (loading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        Getting location...
      </Badge>
    )
  }

  if (error) {
    return (
      <Badge variant="destructive" title={error}>
        GPS error
      </Badge>
    )
  }

  if (isTracking) {
    return (
      <Badge variant="default" className="bg-green-500 text-white">
        Tracking ON
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      Location off
    </Badge>
  )
}