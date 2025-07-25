import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Flame, 
  Sparkles, 
  Activity, 
  Users, 
  MessageCircle, 
  Heart, 
  Star,
  Target,
  Clock,
  Calendar,
  MapPin,
  Zap,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
  LineChart,
  Target as TargetIcon,
  Award,
  Trophy,
  Crown,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { useFloqMembers } from '@/hooks/useFloqMembers';
import { cn } from '@/lib/utils';

interface MemberAnalytics {
  memberId: string;
  name: string;
  avatar: string;
  engagementScore: number;
  activityHeatmap: number[]; // 24 hours
  weeklyActivity: number[]; // 7 days
  interactions: {
    messagesSent: number;
    messagesReceived: number;
    reactionsGiven: number;
    reactionsReceived: number;
    plansJoined: number;
    plansCreated: number;
    invitesSent: number;
    invitesReceived: number;
  };
  behavior: {
    peakHours: number[];
    preferredVibes: string[];
    activeDays: number[];
    averageSessionTime: number; // minutes
    responseTime: number; // minutes
    participationRate: number; // percentage
  };
  achievements: {
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }[];
  insights: {
    type: 'positive' | 'neutral' | 'negative';
    message: string;
    metric: string;
    change: number;
  }[];
}

interface AnalyticsSummary {
  totalMembers: number;
  activeMembers: number;
  averageEngagement: number;
  topPerformers: string[];
  trendingTopics: string[];
  peakActivityHours: number[];
  memberGrowth: number;
  retentionRate: number;
}

export function FloqMemberAnalytics({ floqId }: { floqId: string }) {
  const { members, isLoading, error } = useFloqMembers(floqId);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [viewMode, setViewMode] = useState<'overview' | 'individual' | 'comparison'>('overview');

  // Generate comprehensive member analytics
  const memberAnalytics = useMemo((): MemberAnalytics[] => {
    if (!members) return [];

    return members.map((member) => {
      const activityHeatmap = Array.from({ length: 24 }, () => Math.floor(Math.random() * 10));
      const weeklyActivity = Array.from({ length: 7 }, () => Math.floor(Math.random() * 50));
      const peakHours = [9, 12, 18, 21];
      const preferredVibes = ['Chill', 'Energetic', 'Focused', 'Social'];
      const activeDays = [1, 2, 3, 5, 6]; // Monday, Tuesday, Wednesday, Friday, Saturday

      return {
        memberId: member.id,
        name: member.display_name || member.username,
        avatar: member.avatar_url,
        engagementScore: Math.floor(Math.random() * 100),
        activityHeatmap,
        weeklyActivity,
        interactions: {
          messagesSent: Math.floor(Math.random() * 100),
          messagesReceived: Math.floor(Math.random() * 100),
          reactionsGiven: Math.floor(Math.random() * 50),
          reactionsReceived: Math.floor(Math.random() * 50),
          plansJoined: Math.floor(Math.random() * 20),
          plansCreated: Math.floor(Math.random() * 10),
          invitesSent: Math.floor(Math.random() * 15),
          invitesReceived: Math.floor(Math.random() * 15)
        },
        behavior: {
          peakHours,
          preferredVibes: preferredVibes.slice(0, Math.floor(Math.random() * 3) + 1),
          activeDays,
          averageSessionTime: Math.floor(Math.random() * 120) + 30,
          responseTime: Math.floor(Math.random() * 60) + 5,
          participationRate: Math.floor(Math.random() * 100)
        },
        achievements: [
          {
            name: 'Early Bird',
            description: 'Active before 9 AM',
            icon: '🌅',
            earnedAt: new Date(Date.now() - Math.random() * 86400000 * 7),
            rarity: 'common'
          },
          {
            name: 'Social Butterfly',
            description: 'Interacted with 10+ members',
            icon: '🦋',
            earnedAt: new Date(Date.now() - Math.random() * 86400000 * 3),
            rarity: 'rare'
          },
          {
            name: 'Vibe Master',
            description: 'Changed vibes 5 times in a day',
            icon: '✨',
            earnedAt: new Date(Date.now() - Math.random() * 86400000),
            rarity: 'epic'
          }
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        insights: [
          {
            type: 'positive',
            message: 'Engagement increased by 25%',
            metric: 'Messages sent',
            change: 25
          },
          {
            type: 'neutral',
            message: 'Response time stable',
            metric: 'Avg response time',
            change: 0
          },
          {
            type: 'negative',
            message: 'Activity dropped 10%',
            metric: 'Daily active time',
            change: -10
          }
        ].slice(0, Math.floor(Math.random() * 2) + 1)
      };
    });
  }, [members]);

  // Calculate analytics summary
  const analyticsSummary = useMemo((): AnalyticsSummary => {
    if (memberAnalytics.length === 0) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        averageEngagement: 0,
        topPerformers: [],
        trendingTopics: [],
        peakActivityHours: [],
        memberGrowth: 0,
        retentionRate: 0
      };
    }

    const totalMembers = memberAnalytics.length;
    const activeMembers = memberAnalytics.filter(m => m.engagementScore > 50).length;
    const averageEngagement = Math.floor(
      memberAnalytics.reduce((sum, m) => sum + m.engagementScore, 0) / totalMembers
    );
    const topPerformers = memberAnalytics
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 3)
      .map(m => m.name);
    const trendingTopics = ['Coffee meetups', 'Weekend plans', 'Vibe changes'];
    const peakActivityHours = [9, 12, 18, 21];
    const memberGrowth = Math.floor(Math.random() * 20) + 5;
    const retentionRate = Math.floor(Math.random() * 30) + 70;

    return {
      totalMembers,
      activeMembers,
      averageEngagement,
      topPerformers,
      trendingTopics,
      peakActivityHours,
      memberGrowth,
      retentionRate
    };
  }, [memberAnalytics]);

  // Helper functions
  const getAchievementColor = (rarity: MemberAnalytics['achievements'][0]['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getInsightColor = (type: MemberAnalytics['insights'][0]['type']) => {
    switch (type) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      case 'neutral': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getInsightIcon = (type: MemberAnalytics['insights'][0]['type']) => {
    switch (type) {
      case 'positive': return <TrendingUp className="w-4 h-4" />;
      case 'negative': return <TrendingUp className="w-4 h-4 rotate-180" />;
      case 'neutral': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error || !members) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">Unable to load analytics</h4>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'Something went wrong loading the analytics.'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('overview')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={viewMode === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('individual')}
          >
            <Users className="w-4 h-4 mr-2" />
            Individual
          </Button>
          <Button
            variant={viewMode === 'comparison' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('comparison')}
          >
            <PieChart className="w-4 h-4 mr-2" />
            Comparison
          </Button>
        </div>

        <div className="flex space-x-2">
          <Button
            variant={timeRange === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('24h')}
          >
            24h
          </Button>
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7d
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30d
          </Button>
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{analyticsSummary.totalMembers}</div>
                    <div className="text-sm text-muted-foreground">Total Members</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{analyticsSummary.activeMembers}</div>
                    <div className="text-sm text-muted-foreground">Active Members</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{analyticsSummary.averageEngagement}%</div>
                    <div className="text-sm text-muted-foreground">Avg Engagement</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">{analyticsSummary.memberGrowth}%</div>
                    <div className="text-sm text-muted-foreground">Growth</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Activity Heatmap</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-24 gap-1">
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div
                      key={hour}
                      className="h-8 bg-muted rounded"
                      style={{
                        backgroundColor: `hsl(var(--primary) / ${Math.random() * 0.8 + 0.1})`
                      }}
                      title={`${hour}:00 - ${hour + 1}:00`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>12 AM</span>
                  <span>6 AM</span>
                  <span>12 PM</span>
                  <span>6 PM</span>
                  <span>12 AM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>Top Performers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsSummary.topPerformers.map((name, index) => (
                  <div key={name} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{name}</div>
                      <div className="text-sm text-muted-foreground">
                        {memberAnalytics.find(m => m.name === name)?.engagementScore}% engagement
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual Mode */}
      {viewMode === 'individual' && (
        <div className="space-y-4">
          {memberAnalytics.map((member) => (
            <motion.div
              key={member.memberId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                className={cn(
                  "transition-all duration-200 hover:shadow-md cursor-pointer",
                  selectedMember === member.memberId && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedMember(selectedMember === member.memberId ? null : member.memberId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-medium">
                        {member.name.charAt(0)}
                      </div>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                        member.engagementScore >= 80 ? 'bg-green-500' :
                        member.engagementScore >= 60 ? 'bg-yellow-500' :
                        member.engagementScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      )} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{member.name}</h4>
                        <Badge variant="secondary">
                          {member.engagementScore}% engaged
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{member.interactions.messagesSent} sent</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{member.interactions.reactionsGiven} reactions</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{member.interactions.plansJoined} plans</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {member.behavior.averageSessionTime}m avg session
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.behavior.responseTime}m response time
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedMember === member.memberId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 pt-4 border-t"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {/* Achievements */}
                          <div>
                            <div className="font-medium mb-2">Achievements</div>
                            <div className="space-y-2">
                              {member.achievements.map((achievement, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                                    getAchievementColor(achievement.rarity)
                                  )}>
                                    {achievement.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{achievement.name}</div>
                                    <div className="text-xs text-muted-foreground">{achievement.description}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Insights */}
                          <div>
                            <div className="font-medium mb-2">Insights</div>
                            <div className="space-y-2">
                              {member.insights.map((insight, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <div className={cn("w-4 h-4", getInsightColor(insight.type))}>
                                    {getInsightIcon(insight.type)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm">{insight.message}</div>
                                    <div className="text-xs text-muted-foreground">{insight.metric}</div>
                                  </div>
                                  <Badge variant="secondary">
                                    {insight.change > 0 ? '+' : ''}{insight.change}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Comparison Mode */}
      {viewMode === 'comparison' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">Member Comparison</h4>
              <p className="text-sm text-muted-foreground">
                Compare member performance and engagement patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 