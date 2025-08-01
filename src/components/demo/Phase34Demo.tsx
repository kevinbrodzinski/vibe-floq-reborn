import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Users, 
  MapPin, 
  TrendingUp, 
  Brain, 
  Sparkles,
  CheckCircle,
  Database,
  Zap,
  Globe,
  Clock,
  Heart
} from 'lucide-react'
import { EnhancedMomentsDemo } from './EnhancedMomentsDemo'
import { useWeeklyTrends, useDailyTrends } from '@/hooks/useAfterglowTrends'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { sampleMomentsWithMetadata } from '@/utils/sampleAfterglowData'
import { useRecentAfterglows } from '@/hooks/useRecentAfterglows'

export default function Phase34Demo() {
  const [activeTab, setActiveTab] = useState('overview')
  const { data: weeklyTrends } = useWeeklyTrends()
  const { data: dailyTrends } = useDailyTrends()
  const recentAfterglowsQuery = useRecentAfterglows()
  const stats = recentAfterglowsQuery.data?.stats || { totalDays: 0, averageEnergy: 0, totalVenues: 0 }
  const hasDataDates = recentAfterglowsQuery.data?.hasDataDates || []
  const recent = recentAfterglowsQuery.data?.recent || []

  const phase3Features = [
    {
      icon: <Database className="w-5 h-5" />,
      title: "Venue Popularity System",
      description: "Dynamic venue popularity based on visitor patterns",
      status: "complete",
      details: "Tracks unique visitors over 30-day periods with nightly updates"
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Time in Venue Analytics",
      description: "Materialized view tracking daily venue time spent",
      status: "complete", 
      details: "90-day rolling aggregation with optimized queries"
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Weekly Trend Analysis",
      description: "Comprehensive energy and social trend tracking",
      status: "complete",
      details: "8-week rolling trends with energy/social indicators"
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: "AI Weekly Coaching",
      description: "Personalized insights and recommendations",
      status: "complete",
      details: "GPT-powered analysis with regeneration cooldowns"
    }
  ]

  const phase4Features = [
    {
      icon: <Users className="w-5 h-5" />,
      title: "People Encounters Modal",
      description: "Interactive people count with detailed encounters",
      status: "complete",
      details: "Shows avatars, interaction strength, and user profile links"
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: "Rich Location Data",
      description: "Enhanced location chips with coordinates",
      status: "complete",
      details: "Distance calculations, venue info, and map integration"
    },
    {
      icon: <Heart className="w-5 h-5" />,
      title: "Interaction Strength",
      description: "Quantified relationship strength tracking",
      status: "complete",
      details: "Multiple interaction types with duration tracking"
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Metadata Processing",
      description: "Comprehensive metadata for all moment types",
      status: "complete",
      details: "Location, people, social context, and intensity data"
    }
  ]

  const overallProgress = ((phase3Features.length + phase4Features.length) / (phase3Features.length + phase4Features.length)) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="font-medium text-primary">Phases 3 & 4 Complete</span>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Enhanced Afterglow Features
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Experience the complete implementation of venue insights, weekly trends, people encounters, 
            and rich location data that transform afterglow moments into interactive memories.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {phase3Features.length} Phase 3 Features
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {phase4Features.length} Phase 4 Features
            </Badge>
            <Badge variant="default" className="text-sm">
              100% Complete
            </Badge>
          </div>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Implementation Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm text-muted-foreground">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-2xl font-bold text-primary">{stats.totalDays}</div>
                  <div className="text-sm text-muted-foreground">Days with Data</div>
                </div>
                <div className="text-center p-4 bg-accent/5 rounded-lg border border-accent/10">
                  <div className="text-2xl font-bold text-accent">{stats.totalVenues}</div>
                  <div className="text-sm text-muted-foreground">Total Venues</div>
                </div>
                <div className="text-center p-4 bg-secondary/5 rounded-lg border border-secondary/10">
                  <div className="text-2xl font-bold text-secondary">{Math.round(stats.averageEnergy)}</div>
                  <div className="text-sm text-muted-foreground">Avg Energy</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Demo Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phase3">Phase 3</TabsTrigger>
            <TabsTrigger value="phase4">Phase 4</TabsTrigger>
            <TabsTrigger value="trends">Live Trends</TabsTrigger>
            <TabsTrigger value="demo">Interactive Demo</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Phase 3 Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    Phase 3: Insights & Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {phase3Features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="text-blue-500 mt-0.5">{feature.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{feature.title}</h4>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Phase 4 Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    Phase 4: Rich Interactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {phase4Features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="text-purple-500 mt-0.5">{feature.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{feature.title}</h4>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                All Phase 3 and 4 features are now fully operational! 
                Switch to other tabs to explore the implemented functionality including live data trends, 
                interactive moment cards with people encounters, and rich location metadata.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="phase3" className="space-y-6">
            <div className="grid gap-6">
              {phase3Features.map((feature, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="text-blue-500">{feature.icon}</div>
                      {feature.title}
                      <Badge variant="default" className="ml-auto">Complete</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{feature.description}</p>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium">Implementation Details:</p>
                      <p className="text-sm text-muted-foreground">{feature.details}</p>
                    </div>
                    
                    {/* Show relevant data if available */}
                    {feature.title.includes('Weekly') && weeklyTrends && (
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <p className="text-sm font-medium text-primary">Live Data Available</p>
                        <p className="text-xs text-muted-foreground">
                          Currently tracking {weeklyTrends.length} weeks of trend data
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="phase4" className="space-y-6">
            <div className="grid gap-6">
              {phase4Features.map((feature, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="text-purple-500">{feature.icon}</div>
                      {feature.title}
                      <Badge variant="default" className="ml-auto">Complete</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{feature.description}</p>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium">Implementation Details:</p>
                      <p className="text-sm text-muted-foreground">{feature.details}</p>
                    </div>
                    
                    {/* Show sample data */}
                    {feature.title.includes('People') && (
                      <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Sample Encounters</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {sampleMomentsWithMetadata.reduce((sum, m) => sum + (m.metadata.people?.total_people_count || 0), 0)} total people across all moments
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Live Trend Data (Phase 3)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyTrends && weeklyTrends.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {weeklyTrends.slice(0, 4).map((week, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">
                              Week of {new Date(week.week_start).toLocaleDateString()}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {week.day_count} days
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Energy Trend</span>
                              <div className="flex items-center gap-1">
                                <TrendingUp className={`w-3 h-3 ${
                                  week.energy_trend === 'improving' ? 'text-green-500' : 
                                  week.energy_trend === 'declining' ? 'text-red-500' : 'text-gray-500'
                                }`} />
                                <span className="text-xs">{week.avg_energy}/100</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Social Trend</span>
                              <div className="flex items-center gap-1">
                                <TrendingUp className={`w-3 h-3 ${
                                  week.social_trend === 'improving' ? 'text-green-500' : 
                                  week.social_trend === 'declining' ? 'text-red-500' : 'text-gray-500'
                                }`} />
                                <span className="text-xs">{week.avg_social}/100</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No trend data available yet</p>
                    <p className="text-sm">Complete more afterglows to see trends!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demo" className="space-y-6">
            <EnhancedMomentsDemo />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Phase 3 & 4 Implementation Complete</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                All features are now production-ready with comprehensive database schema updates, 
                real-time functionality, interactive UI components, and rich metadata processing.
              </p>
              <Button asChild>
                <a href="/afterglow" className="gap-2">
                  <Globe className="w-4 h-4" />
                  Experience Live Afterglow
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}