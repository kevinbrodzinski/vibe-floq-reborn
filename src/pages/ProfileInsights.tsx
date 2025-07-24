import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useVenueInsights } from '@/hooks/useVenueInsights'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { format, parseISO } from 'date-fns'

export default function ProfileInsights() {
  const { data, isLoading, error } = useVenueInsights()

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6">
          <Skeleton className="h-48 w-full" />
        </Card>
        <Skeleton className="h-8 w-48" />
        <Card className="p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="p-6">
          <p className="text-destructive">Failed to load insights</p>
        </Card>
      </div>
    )
  }

  const chartData = data?.timeData?.map(d => ({
    day: format(parseISO(d.day), 'MMM dd'),
    minutes: Math.round(d.minutes_spent || 0),
    date: d.day
  })) || []

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Insights</h1>
        <p className="text-muted-foreground">Venue activity and time spent out</p>
      </div>

      {/* Time in venues chart */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Time in venues (last 90 days)</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value) => [`${value} min`, 'Time spent']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar 
                dataKey="minutes" 
                fill="hsl(var(--primary))"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No venue activity data available
          </div>
        )}
      </Card>

      {/* Popular venues */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Most popular venues (30 days)</h2>
        {data?.popularVenues && data.popularVenues.length > 0 ? (
          <div className="space-y-3">
            {data.popularVenues.map((venue, index) => (
              <div key={venue.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {index + 1}
                  </span>
                  <span className="font-medium">{venue.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {venue.popularity} visitor{venue.popularity !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No popular venues data available</p>
        )}
      </Card>
    </div>
  )
}