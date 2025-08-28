import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Clock, 
  Star, 
  Activity,
  Calendar,
  Heart,
  Zap,
  Target,
  Award,
  RefreshCw
} from 'lucide-react';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useWeeklyTrends } from '@/hooks/useAfterglowTrends';
import { usePersonalInsights } from '@/hooks/usePersonalInsights';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

export const PersonalAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  const { data: stats, isLoading: statsLoading } = useProfileStats();
  const { data: trends, isLoading: trendsLoading } = useWeeklyTrends();
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = usePersonalInsights(timeRange);

  const isLoading = statsLoading || trendsLoading || insightsLoading;

  if (!user) return null;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personal Analytics</h1>
          <p className="text-muted-foreground">Your social patterns, insights, and recommendations</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList>
              <TabsTrigger value="7d">7 days</TabsTrigger>
              <TabsTrigger value="30d">30 days</TabsTrigger>
              <TabsTrigger value="90d">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchInsights()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Social Score</p>
                  <p className="text-2xl font-bold">{insights?.socialScore || 85}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <Progress value={insights?.socialScore || 85} className="mt-3" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Exploration Level</p>
                  <p className="text-2xl font-bold">{insights?.explorationLevel || 72}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-secondary" />
                </div>
              </div>
              <Progress value={insights?.explorationLevel || 72} className="mt-3" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Activity Streak</p>
                  <p className="text-2xl font-bold">{stats?.days_active_this_month || 12} days</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <Badge variant="secondary" className="text-xs">
                  {insights?.streakTrend === 'up' ? '↗️' : insights?.streakTrend === 'down' ? '↘️' : '→'} 
                  {insights?.streakChange || '+2'} vs last period
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Friend Connections</p>
                  <p className="text-2xl font-bold">{stats?.friend_count || 24}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <Badge variant="secondary" className="text-xs">
                  +{insights?.newConnections || 3} this period
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Energy & Mood Patterns
                </CardTitle>
                <CardDescription>
                  Your vibe trends and optimal activity times
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Peak Energy Time</span>
                    <Badge>{insights?.peakEnergyTime || '7:00 PM'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Most Social Day</span>
                    <Badge variant="secondary">{insights?.mostSocialDay || 'Friday'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Favorite Vibe</span>
                    <Badge variant="outline">{stats?.most_active_vibe || 'social'}</Badge>
                  </div>
                </div>
                {insights?.energyInsight && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground italic">
                      {insights.energyInsight}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Intelligence
                </CardTitle>
                <CardDescription>
                  Your venue preferences and exploration patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Favorite Venue Type</span>
                    <Badge>{insights?.favoriteVenueType || 'Coffee Shops'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Distance</span>
                    <Badge variant="secondary">{insights?.avgVenueDistance || '1.2km'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Exploration Rate</span>
                    <Progress value={insights?.explorationRate || 65} className="flex-1 mx-2" />
                    <span className="text-xs text-muted-foreground">{insights?.explorationRate || 65}%</span>
                  </div>
                </div>
                {insights?.locationInsight && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground italic">
                      {insights.locationInsight}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Social Activity Trends</CardTitle>
                <CardDescription>Your social engagement over time</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Placeholder for chart component */}
                <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Activity trend chart</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Patterns</CardTitle>
                <CardDescription>Your activity by day of week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-8 text-xs">{day}</span>
                    <Progress value={[40, 60, 55, 80, 95, 85, 70][i]} className="flex-1" />
                    <span className="text-xs text-muted-foreground">{[40, 60, 55, 80, 95, 85, 70][i]}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Personalized Suggestions
                </CardTitle>
                <CardDescription>
                  AI-powered recommendations just for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights?.recommendations?.map((rec, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <h4 className="font-medium">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {rec.confidence}% confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2" />
                    <p>Loading personalized recommendations...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Optimal Timing
                </CardTitle>
                <CardDescription>
                  Best times for different activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Best time to socialize</span>
                    <Badge>{insights?.optimalSocialTime || '6:00-8:00 PM'}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Peak energy window</span>
                    <Badge variant="secondary">{insights?.peakEnergyWindow || '7:00-9:00 PM'}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Best exploration time</span>
                    <Badge variant="outline">{insights?.optimalExploreTime || '2:00-4:00 PM'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Your Achievements
              </CardTitle>
              <CardDescription>
                Milestones and badges you've earned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights?.achievements?.map((achievement, i) => (
                  <div key={i} className="p-4 border rounded-lg text-center">
                    <div className="text-2xl mb-2">{achievement.icon}</div>
                    <h4 className="font-medium">{achievement.title}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    <Badge variant="secondary" className="mt-2">
                      {achievement.earnedAt}
                    </Badge>
                  </div>
                )) || (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Award className="h-8 w-8 mx-auto mb-2" />
                    <p>Keep being social to earn achievements!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};