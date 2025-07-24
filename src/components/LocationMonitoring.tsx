import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'

interface MonitoringData {
  recentPings: Array<{ hour: string; count: number }>
  recentVisits: Array<{ day_key: string; count: number }>
  systemHealth: {
    stagingCount: number
    mainCount: number
    venueCount: number
  }
}

export function LocationMonitoring() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchMonitoringData = async () => {
    setLoading(true)
    try {
      // Query recent location pings (last 24h by hour)
      const { data: pings } = await supabase.rpc('monitoring_recent_pings')
      
      // Query recent venue visits (last 14 days)  
      const { data: visits } = await supabase.rpc('monitoring_recent_visits')
      
      // Query system health
      const { data: health } = await supabase.rpc('monitoring_system_health')

      setData({
        recentPings: pings || [],
        recentVisits: visits || [],
        systemHealth: health?.[0] || { stagingCount: 0, mainCount: 0, venueCount: 0 }
      })
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitoringData()
  }, [])

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Location Pipeline Monitoring</CardTitle>
          <CardDescription>Loading system status...</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchMonitoringData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Data'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Current pipeline status</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{data.systemHealth.stagingCount}</div>
            <div className="text-sm text-muted-foreground">Staging Queue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.systemHealth.mainCount}</div>
            <div className="text-sm text-muted-foreground">Processed Pings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.systemHealth.venueCount}</div>
            <div className="text-sm text-muted-foreground">Venues</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Location Pings</CardTitle>
            <CardDescription>Last 24 hours by hour</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentPings.length > 0 ? (
              <div className="space-y-2">
                {data.recentPings.slice(0, 10).map((ping, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{ping.hour}</span>
                    <span className="font-mono">{ping.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent pings</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Venue Visits</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentVisits.length > 0 ? (
              <div className="space-y-2">
                {data.recentVisits.slice(0, 10).map((visit, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{visit.day_key}</span>
                    <span className="font-mono">{visit.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent visits</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button onClick={fetchMonitoringData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
    </div>
  )
}