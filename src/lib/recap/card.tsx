import React, { lazy, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, MapPin, Users, TrendingUp } from 'lucide-react'
import { RecapData } from './index'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

// Lazy import confetti for performance
const confetti = lazy(() => import('canvas-confetti'))

interface DailyRecapCardProps {
  data: RecapData
}

export default function DailyRecapCard({ data }: DailyRecapCardProps) {
  const timelineData = data.timeline?.map(t => ({
    hour: t.hour,
    mins: t.mins,
    label: t.hour === 0 ? '12AM' : t.hour <= 12 ? `${t.hour}AM` : `${t.hour - 12}PM`
  })) || []

  const totalHours = Math.floor(data.totalMins / 60)
  const remainingMins = data.totalMins % 60

  // Trigger confetti for exceptional days
  React.useEffect(() => {
    if (data.totalMins > 300) { // 5+ hours out
      import('canvas-confetti').then(confetti => {
        confetti.default({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        })
      })
    }
  }, [data.totalMins])

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl font-bold text-foreground">
          Yesterday's Adventure
        </CardTitle>
        <p className="text-sm text-muted-foreground">{data.day}</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Time Out</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {totalHours > 0 ? `${totalHours}h` : ''}
              {remainingMins > 0 ? ` ${remainingMins}m` : totalHours === 0 ? `${remainingMins}m` : ''}
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Places</span>
            </div>
            <div className="text-lg font-bold text-foreground">{data.venues}</div>
          </div>
        </div>

        {/* Timeline Chart */}
        {timelineData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Daily Timeline</h4>
            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={timelineData}
                  role="img"
                  aria-label={`Timeline of minutes spent out between ${timelineData[0]?.label || '12AM'} and ${timelineData[timelineData.length - 1]?.label || '11PM'}`}
                >
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    tickFormatter={(hour) => hour === 0 ? '12A' : hour <= 12 ? `${hour}A` : `${hour-12}P`}
                  />
                  <YAxis hide />
                  <Bar dataKey="mins" fill="hsl(var(--primary))" radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Encounters */}
        {data.encounters > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Crossed paths with {data.encounters} {data.encounters === 1 ? 'person' : 'people'}
              </p>
              <p className="text-xs text-muted-foreground">The city brought you together</p>
            </div>
          </div>
        )}

        {/* Longest Stay */}
        {data.longestStay.venue && data.longestStay.mins > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Longest stay: {data.longestStay.mins}m
              </p>
              <p className="text-xs text-muted-foreground">at {data.longestStay.venue}</p>
            </div>
          </div>
        )}

        {/* Top Venues */}
        {data.topVenues && data.topVenues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Your Hotspots</h4>
            <div className="space-y-2">
              {data.topVenues.slice(0, 3).map((venue, idx) => (
                <div key={venue.id} className="flex items-center justify-between p-2 rounded bg-background/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm text-foreground">{venue.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{venue.mins}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Activity Message */}
        {data.venues === 0 && data.encounters === 0 && data.totalMins === 0 && (
          <div className="text-center p-4 rounded-lg bg-background/50">
            <p className="text-sm text-muted-foreground">
              A quiet day at home. Sometimes that's exactly what we need.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}