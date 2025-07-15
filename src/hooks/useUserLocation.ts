import { useState, useEffect } from 'react'

interface LocationCoords {
  latitude: number
  longitude: number
  accuracy: number
}

interface LocationData {
  coords: LocationCoords
  timestamp: number
}

interface UseLocationReturn {
  location: LocationData | null
  loading: boolean
  error: string | null
}

export const useUserLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 30000 // 30 seconds
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setLocation({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        },
        timestamp: position.timestamp
      })
      setLoading(false)
      setError(null)
    }

    const handleError = (error: GeolocationPositionError) => {
      setError(error.message)
      setLoading(false)
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options)

    // Watch position changes
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess, 
      handleError, 
      options
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  return { location, loading, error }
}