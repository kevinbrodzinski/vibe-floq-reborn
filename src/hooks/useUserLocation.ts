import { useState, useEffect } from 'react'

interface LocationCoords {
  latitude: number
  longitude: number
  accuracy: number
}

interface LocationData {
  coords: LocationCoords
  timestamp: number
  geohash?: string
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
      // Simple geohash calculation for geohash-5
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      // Basic geohash implementation (simplified)
      let latRange = [-90, 90];
      let lngRange = [-180, 180];
      let geohash = '';
      let isLng = true;
      
      for (let i = 0; i < 25; i++) { // 5 chars * 5 bits = 25 bits
        if (isLng) {
          const mid = (lngRange[0] + lngRange[1]) / 2;
          if (lng >= mid) {
            geohash += '1';
            lngRange[0] = mid;
          } else {
            geohash += '0';
            lngRange[1] = mid;
          }
        } else {
          const mid = (latRange[0] + latRange[1]) / 2;
          if (lat >= mid) {
            geohash += '1';
            latRange[0] = mid;
          } else {
            geohash += '0';
            latRange[1] = mid;
          }
        }
        isLng = !isLng;
      }
      
      // Convert binary to base32 (simplified to first 5 chars)
      const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
      let gh5 = '';
      for (let i = 0; i < 25; i += 5) {
        const chunk = geohash.slice(i, i + 5);
        const index = parseInt(chunk, 2);
        gh5 += base32[index];
      }

      setLocation({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        },
        timestamp: position.timestamp,
        geohash: gh5
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