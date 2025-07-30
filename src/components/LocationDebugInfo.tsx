import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUserLocation } from '@/hooks/useUserLocation'

export function LocationDebugInfo() {
  const { 
    location, 
    isTracking, 
    loading, 
    error, 
    hasPermission, 
    checkPermission, 
    resetLocation,
    startTracking,
    stopTracking 
  } = useUserLocation()
  
  const [browserInfo, setBrowserInfo] = useState<any>(null)
  const [permissionState, setPermissionState] = useState<string>('unknown')

  // Enhanced location reset functionality
  const resetAllLocation = () => {
    console.log('[LocationDebugInfo] Resetting all location services...')
    
    // Reset the location hook first
    resetLocation()
    
    // Force clear any stuck geolocation watches
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Clear any potential stuck watch IDs (brute force approach)
      for (let i = 0; i < 1000; i++) {
        try {
          navigator.geolocation.clearWatch(i)
        } catch (e) {
          // Ignore errors from invalid watch IDs
        }
      }
    }
    
    // Try to check permission again
    navigator.permissions?.query({ name: 'geolocation' })
      .then(permission => {
        console.log('[LocationDebugInfo] Permission state after reset:', permission.state)
        setPermissionState(permission.state)
      })
      .catch(() => {
        console.log('[LocationDebugInfo] Could not query permission after reset')
      })
  }

  useEffect(() => {
    const isCapacitor = !!(window as any).Capacitor
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isChrome = /chrome/i.test(navigator.userAgent)
    const hasGeolocation = 'geolocation' in navigator
    const hasPermissions = 'permissions' in navigator
    
    setBrowserInfo({
      isCapacitor,
      isIOS,
      isSafari,
      isChrome,
      hasGeolocation,
      hasPermissions,
      userAgent: navigator.userAgent
    })

    // Check permission state
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(permission => {
          setPermissionState(permission.state)
          permission.addEventListener('change', () => {
            setPermissionState(permission.state)
          })
        })
        .catch(() => setPermissionState('unavailable'))
    }
  }, [isTracking])

  const handleCheckPermission = async () => {
    const granted = await checkPermission()
    console.log('[LocationDebug] Permission check result:', granted)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted': return 'bg-green-500'
      case 'denied': return 'bg-red-500'
      case 'prompt': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Location Debug Info
          <Badge variant="outline" className="text-xs">
            {isTracking ? 'TRACKING' : 'IDLE'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Diagnostic information for location services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current State */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium mb-1">Tracking State</div>
            <div className="space-y-1">
              <div>Loading: <Badge variant={loading ? "default" : "outline"}>{loading ? "Yes" : "No"}</Badge></div>
              <div>Has Permission: <Badge variant={hasPermission ? "default" : "destructive"}>{hasPermission ? "Yes" : "No"}</Badge></div>
              <div>Error: {error ? <Badge variant="destructive">{error}</Badge> : <Badge variant="outline">None</Badge>}</div>
            </div>
          </div>
          
          <div>
            <div className="font-medium mb-1">Permission State</div>
            <Badge className={`${getStatusColor(permissionState)} text-white`}>
              {permissionState.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Location Data */}
        {location && (
          <div>
            <div className="font-medium mb-1">Current Location</div>
            <div className="text-xs space-y-1 font-mono bg-muted p-2 rounded">
              <div>Lat: {location.coords.latitude.toFixed(6)}</div>
              <div>Lng: {location.coords.longitude.toFixed(6)}</div>
              <div>Accuracy: {location.coords.accuracy.toFixed(0)}m</div>
            </div>
          </div>
        )}

        {/* Browser Info */}
        {browserInfo && (
          <div>
            <div className="font-medium mb-1">Browser Detection</div>
            <div className="text-xs space-y-1">
              <div className="flex gap-2">
                <Badge variant={browserInfo.isIOS ? "default" : "outline"}>iOS</Badge>
                <Badge variant={browserInfo.isSafari ? "default" : "outline"}>Safari</Badge>
                <Badge variant={browserInfo.isChrome ? "default" : "outline"}>Chrome</Badge>
                <Badge variant={browserInfo.isCapacitor ? "default" : "outline"}>Capacitor</Badge>
              </div>
              <div className="flex gap-2">
                <Badge variant={browserInfo.hasGeolocation ? "default" : "destructive"}>Geolocation API</Badge>
                <Badge variant={browserInfo.hasPermissions ? "default" : "destructive"}>Permissions API</Badge>
              </div>
              <div className="flex gap-2">
                <Badge variant={isTracking ? "default" : "outline"}>Location Tracking</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCheckPermission} size="sm" variant="outline">
            Check Permission
          </Button>
          <Button onClick={resetAllLocation} size="sm" variant="destructive">
            Reset All Location
          </Button>
          {isTracking ? (
            <Button onClick={stopTracking} size="sm" variant="destructive">
              Stop Tracking
            </Button>
          ) : (
            <Button onClick={startTracking} size="sm" variant="default">
              Start Tracking
            </Button>
          )}
        </div>

        {/* iOS Safari Instructions */}
        {browserInfo?.isIOS && browserInfo?.isSafari && permissionState === 'denied' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
            <div className="font-medium text-yellow-800 mb-1">iOS Safari Location Fix:</div>
            <div className="text-yellow-700">
              Go to Settings → Safari → Location Services → Enable "While Using App"
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}