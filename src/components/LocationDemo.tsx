import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationStatusChip } from '@/components/LocationStatusChip'
import { useUserLocation, useAfterglowNotifications } from '@/hooks/usePlanRecap'

export function LocationDemo() {
  const { isTracking, loading, error, startTracking, stopTracking } = useUserLocation()
  
  // Enable afterglow notifications
  useAfterglowNotifications()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Location Tracking
          <LocationStatusChip />
        </CardTitle>
        <CardDescription>
          Enable location tracking to automatically detect venue visits and generate daily afterglows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={startTracking} 
            disabled={isTracking || loading}
            className="flex-1"
          >
            {loading ? 'Starting...' : 'Start Tracking'}
          </Button>
          
          <Button 
            onClick={stopTracking} 
            disabled={!isTracking}
            variant="outline"
            className="flex-1"
          >
            Stop Tracking
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Locations are processed every 5 minutes</p>
          <p>• Daily afterglows generated at 3:00 AM UTC</p>
          <p>• You'll get a notification when your afterglow is ready</p>
        </div>
      </CardContent>
    </Card>
  )
}