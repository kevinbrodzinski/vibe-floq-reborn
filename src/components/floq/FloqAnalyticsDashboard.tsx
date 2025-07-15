import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Users, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  Clock,
  Target,
  BarChart3
} from 'lucide-react';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface FloqAnalyticsDashboardProps {
  floqDetails: FloqDetails;
}

export const FloqAnalyticsDashboard: React.FC<FloqAnalyticsDashboardProps> = ({ floqDetails }) => {
  // Mock analytics data - will be replaced with real data later
  const analytics = {
    totalParticipants: floqDetails.participant_count || 0,
    activeToday: Math.floor((floqDetails.participant_count || 0) * 0.7),
    messagesCount: 42,
    plansCreated: 3,
    engagementScore: 85,
    peakActivity: '2:30 PM',
    avgSessionTime: '12 min',
    retentionRate: 78
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics Dashboard
        </h3>
        <Badge variant="outline">Last 7 days</Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Total Members</span>
          </div>
          <div className="text-2xl font-bold">{analytics.totalParticipants}</div>
          <div className="text-xs text-muted-foreground">
            {analytics.activeToday} active today
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Messages</span>
          </div>
          <div className="text-2xl font-bold">{analytics.messagesCount}</div>
          <div className="text-xs text-green-600 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +15% vs last week
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Plans</span>
          </div>
          <div className="text-2xl font-bold">{analytics.plansCreated}</div>
          <div className="text-xs text-muted-foreground">
            2 upcoming
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Engagement</span>
          </div>
          <div className="text-2xl font-bold">{analytics.engagementScore}%</div>
          <div className="text-xs text-green-600 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +8% vs last week
          </div>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <Card className="p-6">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Activity Insights
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Peak Activity Time</span>
              <span className="font-medium">{analytics.peakActivity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Session Time</span>
              <span className="font-medium">{analytics.avgSessionTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Retention Rate</span>
              <span className="font-medium">{analytics.retentionRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Response Rate</span>
              <span className="font-medium">92%</span>
            </div>
          </div>
        </Card>

        {/* Member Growth */}
        <Card className="p-6">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Member Growth
          </h4>
          <div className="space-y-4">
            <div className="h-32 bg-muted/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Growth chart coming soon</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">This week</span>
              <span className="font-medium text-green-600">+3 members</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Performance Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="text-lg font-bold text-green-600">Excellent</div>
            <div className="text-sm text-muted-foreground">Member Engagement</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-lg font-bold text-blue-600">Good</div>
            <div className="text-sm text-muted-foreground">Activity Level</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">Growing</div>
            <div className="text-sm text-muted-foreground">Member Base</div>
          </div>
        </div>
      </Card>
    </div>
  );
};