import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Zap,
  Heart,
  MapPin,
  Star
} from 'lucide-react';
import { ArchiveStats } from '@/lib/supabase-helpers';
import { format } from 'date-fns';
import EnergyTrendChart from './trends/EnergyTrendChart';
import SocialTrendChart from './trends/SocialTrendChart';

interface ArchiveStatsCardProps {
  stats: ArchiveStats;
}

export function ArchiveStatsCard({ stats }: ArchiveStatsCardProps) {
  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      case 'stable':
        return 'text-muted-foreground';
    }
  };

  const getActivityColor = (rate: 'high' | 'medium' | 'low') => {
    switch (rate) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Archive Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.overview.total_days}</div>
            <div className="text-sm text-muted-foreground">Total Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.overview.total_moments}</div>
            <div className="text-sm text-muted-foreground">Total Moments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.overview.pinned_days}</div>
            <div className="text-sm text-muted-foreground">Pinned Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.overview.active_days}</div>
            <div className="text-sm text-muted-foreground">Active Days</div>
          </div>
        </div>

        <Separator />

        {/* Energy Insights */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Energy Insights
          </h4>
          <div className="space-y-2">
            <div className="text-sm font-medium">Energy last 30 days</div>
            <EnergyTrendChart />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">All Time Average</div>
              <div className="text-muted-foreground">{stats.energy_insights.avg_energy_all_time}/100</div>
            </div>
            <div>
              <div className="font-medium">Last 30 Days</div>
              <div className="text-muted-foreground">{stats.energy_insights.avg_energy_last_30}/100</div>
            </div>
            <div>
              <div className="font-medium">High Energy Days</div>
              <div className="text-muted-foreground">{stats.energy_insights.high_energy_days}</div>
            </div>
            <div>
              <div className="font-medium flex items-center gap-1">
                Trend
                {getTrendIcon(stats.energy_insights.energy_trend)}
              </div>
              <div className={cn("text-sm", getTrendColor(stats.energy_insights.energy_trend))}>
                {stats.energy_insights.energy_trend}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Social Insights */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Social Insights
          </h4>
          <div className="space-y-2">
            <div className="text-sm font-medium">Social last 30 days</div>
            <SocialTrendChart />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">All Time Average</div>
              <div className="text-muted-foreground">{stats.social_insights.avg_social_all_time}/100</div>
            </div>
            <div>
              <div className="font-medium">Last 30 Days</div>
              <div className="text-muted-foreground">{stats.social_insights.avg_social_last_30}/100</div>
            </div>
            <div>
              <div className="font-medium">High Social Days</div>
              <div className="text-muted-foreground">{stats.social_insights.high_social_days}</div>
            </div>
            <div>
              <div className="font-medium flex items-center gap-1">
                Trend
                {getTrendIcon(stats.social_insights.social_trend)}
              </div>
              <div className={cn("text-sm", getTrendColor(stats.social_insights.social_trend))}>
                {stats.social_insights.social_trend}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Activity Summary */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Activity Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Venues Visited</div>
              <div className="text-muted-foreground">{stats.activity_summary.total_venues_visited}</div>
            </div>
            <div>
              <div className="font-medium">Floqs Joined</div>
              <div className="text-muted-foreground">{stats.activity_summary.total_floqs_joined}</div>
            </div>
            <div>
              <div className="font-medium">Paths Crossed</div>
              <div className="text-muted-foreground">{stats.activity_summary.total_paths_crossed}</div>
            </div>
            <div>
              <div className="font-medium">Most Common Vibe</div>
              <div className="text-muted-foreground capitalize">
                {stats.activity_summary.most_common_vibe || 'None'}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Recent Activity */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Star className="w-4 h-4" />
            Recent Activity
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-sm">Days logged (last 30)</span>
            <span className="font-medium">{stats.recent_activity.days_logged_last_30}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Activity rate</span>
            <Badge className={getActivityColor(stats.recent_activity.activity_rate_last_30)}>
              {stats.recent_activity.activity_rate_last_30}
            </Badge>
          </div>
        </div>

        {/* Date Range */}
        {stats.overview.first_entry && stats.overview.latest_entry && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground text-center">
              Archive spans from {format(new Date(stats.overview.first_entry), 'MMM d, yyyy')} to{' '}
              {format(new Date(stats.overview.latest_entry), 'MMM d, yyyy')}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}