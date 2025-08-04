/**
 * Enhanced Daily Recap Card
 * Shows detailed analytics including auto check-in monitoring and proximity events
 */

import React, { useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  MapPin, 
  Users, 
  TrendingUp, 
  Zap, 
  Shield, 
  Target,
  Award,
  Activity,
  Radar
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { track } from '@/lib/analytics'
import dayjs from '@/lib/dayjs'
import type { EnhancedRecapData } from './enhanced-analytics'
import { getRecapInsights } from './enhanced-analytics'

interface EnhancedDailyRecapCardProps {
  data: EnhancedRecapData
  showEnhancedMetrics?: boolean
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))']

export default function EnhancedDailyRecapCard({ 
  data, 
  showEnhancedMetrics = true 
}: EnhancedDailyRecapCardProps) {
  const hasTrackedRef = useRef<string | null>(null)
  const insights = getRecapInsights(data)

  const timelineData = data.timeline?.map(t => ({
    hour: t.hour,
    mins: t.mins,
    label: t.hour === 0 ? '12AM' : t.hour <= 12 ? `${t.hour}AM` : `${t.hour - 12}PM`
  })) || []

  const totalHours = Math.floor(data.totalMins / 60)
  const remainingMins = data.totalMins % 60

  // Auto check-in success rate
  const successRate = data.autoCheckins.total > 0 
    ? (data.autoCheckins.successful / data.autoCheckins.total) * 100 
    : 0

  // Detection method pie chart data
  const detectionData = [
    { name: 'Enhanced', value: data.autoCheckins.detectionMethods.enhanced, color: COLORS[0] },
    { name: 'GPS Fallback', value: data.autoCheckins.detectionMethods.gps_fallback, color: COLORS[1] }
  ].filter(d => d.value > 0)

  // Track "enhanced_recap_seen" only once per calendar day
  useEffect(() => {
    const todayKey = dayjs().format('YYYY-MM-DD')
    if (hasTrackedRef.current === todayKey) return

    track('enhanced_recap_seen', { 
      day: todayKey,
      autoCheckins: data.autoCheckins.total,
      proximityEvents: data.proximityEvents.totalEvents,
      newVenues: data.venueInsights.newVenues
    })
    hasTrackedRef.current = todayKey
  }, [data])

  // Trigger confetti for exceptional days or personal records
  React.useEffect(() => {
    const hasRecord = data.personalRecords.longestDayThisMonth || 
                     data.personalRecords.mostVenuesThisMonth || 
                     data.personalRecords.mostSocialThisMonth

    if (data.totalMins > 300 || hasRecord) {
      import('canvas-confetti').then(confetti => {
        confetti.default({
          particleCount: hasRecord ? 100 : 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: hasRecord ? ['#FFD700', '#FFA500', '#FF6347'] : undefined
        })
      })
    }
  }, [data.totalMins, data.personalRecords])

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Enhanced Daily Recap
        </CardTitle>
        <p className="text-sm text-muted-foreground">{data.day}</p>
        
        {/* Personal Records Banner */}
        {(data.personalRecords.longestDayThisMonth || 
          data.personalRecords.mostVenuesThisMonth || 
          data.personalRecords.mostSocialThisMonth) && (
          <div className="mt-2">
            <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
              <Award className="w-3 h-3 mr-1" />
              Personal Record Day!
            </Badge>
          </div>
        )}
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

        {/* Enhanced Auto Check-in Metrics */}
        {showEnhancedMetrics && data.autoCheckins.total > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Auto Check-in Performance
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded bg-background/30">
                <div className="text-lg font-bold text-green-600">{data.autoCheckins.successful}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-2 rounded bg-background/30">
                <div className="text-lg font-bold text-primary">{successRate.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>

            {/* Detection Method Breakdown */}
            {detectionData.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">Detection Methods</div>
                  <div className="flex gap-2">
                    {detectionData.map(method => (
                      <Badge key={method.name} variant="outline" className="text-xs">
                        {method.name}: {method.value}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={detectionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={8}
                        outerRadius={24}
                        dataKey="value"
                      >
                        {detectionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proximity Events */}
        {showEnhancedMetrics && data.proximityEvents.totalEvents > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Radar className="w-4 h-4 text-blue-500" />
              Proximity Detection
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded bg-blue-50/50">
                <div className="text-sm font-bold text-blue-600">{data.proximityEvents.totalEvents}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
              <div className="text-center p-2 rounded bg-blue-50/50">
                <div className="text-sm font-bold text-blue-600">{data.proximityEvents.uniqueFriends}</div>
                <div className="text-xs text-muted-foreground">Friends</div>
              </div>
              <div className="text-center p-2 rounded bg-blue-50/50">
                <div className="text-sm font-bold text-blue-600">{data.proximityEvents.closestEncounter.distance}m</div>
                <div className="text-xs text-muted-foreground">Closest</div>
              </div>
            </div>
          </div>
        )}

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
                    tickFormatter={(hour) => hour === 0 ? '12A' : hour <= 12 ? `${hour}A` : `${hour - 12}P`}
                  />
                  <YAxis hide />
                  <Bar dataKey="mins" fill="hsl(var(--primary))" radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Venue Insights */}
        {showEnhancedMetrics && data.venueInsights.newVenues > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50/50">
            <MapPin className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Discovered {data.venueInsights.newVenues} new {data.venueInsights.newVenues === 1 ? 'place' : 'places'}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.venueInsights.returnVisits} return visits to familiar spots
              </p>
            </div>
          </div>
        )}

        {/* Social Encounters */}
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
                <div
                  key={venue.id}
                  className="flex items-center justify-between p-2 rounded bg-background/30"
                  dir="auto"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm text-foreground" dir="auto">{venue.name}</span>
                    {venue.popularity > 99 && (
                      <Badge variant="destructive" className="text-xs px-1">🔥</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{venue.mins}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI-Generated Insights */}
        {showEnhancedMetrics && insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              Smart Insights
            </h4>
            <div className="space-y-1">
              {insights.slice(0, 3).map((insight, idx) => (
                <p key={idx} className="text-xs text-muted-foreground bg-purple-50/30 p-2 rounded">
                  {insight}
                </p>
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