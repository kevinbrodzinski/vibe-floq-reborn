import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenueSyncStats } from '@/hooks/useAutomatedVenueSync';

interface DashboardStats {
  totalVenues: number;
  recentSyncs: number;
  successRate: number;
  avgVenuesPerSync: number;
  lastSyncAt: string | null;
  errorRate: number;
  topSources: Array<{ source: string; count: number }>;
  schedulerStats: {
    pendingJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'sync' | 'intelligence' | 'cleanup' | 'error';
  message: string;
  timestamp: Date;
  status: 'success' | 'error' | 'warning';
  details?: any;
}

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'green' | 'red' | 'yellow';
}> = ({ title, value, subtitle, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900'
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    stable: '→'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs opacity-60 mt-1">{subtitle}</p>
          )}
        </div>
        {trend && (
          <div className="text-lg">
            {trendIcons[trend]}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityFeed: React.FC<{ activities: RecentActivity[] }> = ({ activities }) => {
  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'sync': return '🔄';
      case 'intelligence': return '🧠';
      case 'cleanup': return '🧹';
      case 'error': return '❌';
      default: return '📝';
    }
  };

  const getStatusColor = (status: RecentActivity['status']) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
              <div className="text-lg">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${getStatusColor(activity.status)}`}>
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.timestamp.toLocaleString()}
                </p>
                {activity.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer">Show details</summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(activity.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ErrorLogPanel: React.FC = () => {
  const { data: errors, isLoading } = useQuery({
    queryKey: ['venue-sync-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues_sync_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Error Log</h3>
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Error Log</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {!errors || errors.length === 0 ? (
          <p className="text-green-600 text-sm">No recent errors 🎉</p>
        ) : (
          errors.map((error: any) => (
            <div key={error.id} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
              <div className="font-medium text-red-800">{error.reason}</div>
              <div className="text-red-600 text-xs mt-1">
                {error.source} • {new Date(error.created_at).toLocaleString()}
              </div>
              {error.lat && error.lng && (
                <div className="text-red-500 text-xs">
                  Location: {error.lat}, {error.lng}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const VenueMonitoringDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const syncStats = useVenueSyncStats();

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['venue-dashboard-stats', refreshKey],
    queryFn: async (): Promise<DashboardStats> => {
      // Get venue count
      const { count: totalVenues } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true });

      // Get scheduler stats
      const { data: schedulerJobs } = await supabase
        .from('venue_scheduler_jobs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const schedulerStats = {
        pendingJobs: schedulerJobs?.filter(j => j.status === 'pending').length || 0,
        runningJobs: schedulerJobs?.filter(j => j.status === 'running').length || 0,
        completedJobs: schedulerJobs?.filter(j => j.status === 'completed').length || 0,
        failedJobs: schedulerJobs?.filter(j => j.status === 'failed').length || 0
      };

      // Get sync statistics
      const { data: syncLog } = await supabase
        .from('sync_log')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const recentSyncs = syncLog?.length || 0;
      const successfulSyncs = syncLog?.filter(log => 
        log.metadata?.result?.ok === true
      ).length || 0;
      
      const successRate = recentSyncs > 0 ? (successfulSyncs / recentSyncs) * 100 : 0;
      
      const avgVenuesPerSync = syncLog?.reduce((sum, log) => {
        const venues = log.metadata?.result?.total_venues || 0;
        return sum + venues;
      }, 0) / Math.max(recentSyncs, 1) || 0;

      // Get top sources
      const { data: venues } = await supabase
        .from('venues')
        .select('source')
        .not('source', 'is', null);

      const sourceCounts = venues?.reduce((acc: Record<string, number>, venue) => {
        acc[venue.source] = (acc[venue.source] || 0) + 1;
        return acc;
      }, {}) || {};

      const topSources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalVenues: totalVenues || 0,
        recentSyncs,
        successRate,
        avgVenuesPerSync,
        lastSyncAt: syncLog?.[0]?.created_at || null,
        errorRate: recentSyncs > 0 ? ((recentSyncs - successfulSyncs) / recentSyncs) * 100 : 0,
        topSources,
        schedulerStats
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Generate recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['venue-recent-activity', refreshKey],
    queryFn: async (): Promise<RecentActivity[]> => {
      const activities: RecentActivity[] = [];

      // Get recent sync logs
      const { data: syncLogs } = await supabase
        .from('sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      syncLogs?.forEach(log => {
        const result = log.metadata?.result;
        activities.push({
          id: `sync-${log.id}`,
          type: 'sync',
          message: result?.ok 
            ? `Synced ${result.total_venues || 0} venues`
            : 'Venue sync failed',
          timestamp: new Date(log.created_at),
          status: result?.ok ? 'success' : 'error',
          details: result
        });
      });

      // Get recent scheduler jobs
      const { data: jobs } = await supabase
        .from('venue_scheduler_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      jobs?.forEach(job => {
        activities.push({
          id: `job-${job.id}`,
          type: job.type === 'venue_intelligence' ? 'intelligence' : 
                job.type === 'venue_cleanup' ? 'cleanup' : 'sync',
          message: `${job.type.replace('_', ' ')} job ${job.status}`,
          timestamp: new Date(job.created_at),
          status: job.status === 'completed' ? 'success' : 
                  job.status === 'failed' ? 'error' : 'warning',
          details: { type: job.type, status: job.status, result: job.result }
        });
      });

      // Sort by timestamp
      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRunScheduler = async () => {
    try {
      await supabase.functions.invoke('venue-scheduler', {
        body: { action: 'run_jobs' }
      });
      setTimeout(handleRefresh, 2000);
    } catch (error) {
      console.error('Failed to run scheduler:', error);
    }
  };

  if (statsLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Venue System Monitoring</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={handleRunScheduler}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            Run Jobs
          </button>
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Venues"
          value={dashboardStats?.totalVenues.toLocaleString() || '0'}
          subtitle="In database"
          color="blue"
        />
        <MetricCard
          title="Success Rate"
          value={`${dashboardStats?.successRate.toFixed(1) || '0'}%`}
          subtitle="Last 7 days"
          color={dashboardStats && dashboardStats.successRate > 90 ? 'green' : 
                 dashboardStats && dashboardStats.successRate > 70 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="Recent Syncs"
          value={dashboardStats?.recentSyncs || 0}
          subtitle="Last 7 days"
          color="blue"
        />
        <MetricCard
          title="Avg Venues/Sync"
          value={dashboardStats?.avgVenuesPerSync.toFixed(0) || '0'}
          subtitle="Per sync operation"
          color="green"
        />
      </div>

      {/* Scheduler status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Pending Jobs"
          value={dashboardStats?.schedulerStats.pendingJobs || 0}
          color="yellow"
        />
        <MetricCard
          title="Running Jobs"
          value={dashboardStats?.schedulerStats.runningJobs || 0}
          color="blue"
        />
        <MetricCard
          title="Completed Jobs"
          value={dashboardStats?.schedulerStats.completedJobs || 0}
          color="green"
        />
        <MetricCard
          title="Failed Jobs"
          value={dashboardStats?.schedulerStats.failedJobs || 0}
          color="red"
        />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <ActivityFeed activities={recentActivity || []} />

        {/* Error log */}
        <ErrorLogPanel />
      </div>

      {/* Top sources */}
      {dashboardStats?.topSources && dashboardStats.topSources.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Top Venue Sources</h3>
          <div className="space-y-2">
            {dashboardStats.topSources.map((source) => (
              <div key={source.source} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{source.source}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(source.count / (dashboardStats.totalVenues || 1)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{source.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};