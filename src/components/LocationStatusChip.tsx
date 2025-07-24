import { Badge } from '@/components/ui/badge'
import { useUserLocation } from '@/hooks/usePlanRecap'

export function LocationStatusChip() {
  const { isTracking, loading, error } = useUserLocation()

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