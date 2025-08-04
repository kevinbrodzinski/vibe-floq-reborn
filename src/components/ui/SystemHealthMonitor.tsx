import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Activity, Database, MapPin, Zap, Clock, TrendingUp } from 'lucide-react';
import { LocationEnhancedVibeSystem } from '@/lib/vibeAnalysis/LocationEnhancedVibeSystem';
import { VibeSystemIntegration } from '@/lib/vibeAnalysis/VibeSystemIntegration';
import type { SystemHealthMetrics } from '@/lib/vibeAnalysis/VibeSystemIntegration';

interface SystemHealthMonitorProps {
  showLocationMetrics?: boolean;
  compactMode?: boolean;
}

/**
 * SystemHealthMonitor - Development/admin dashboard for system health
 * Shows real-time metrics for the enhanced vibe detection system
 */
export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  showLocationMetrics = false,
  compactMode = false
}) => {
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vibeSystem] = useState(() => 
    showLocationMetrics ? new LocationEnhancedVibeSystem() : new VibeSystemIntegration()
  );

  // Fetch health metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const metrics = await vibeSystem.getSystemHealthMetrics();
        setHealthMetrics(metrics);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch system health metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [vibeSystem]);

  const getHealthColor = (value: number) => {
    if (value >= 0.8) return 'text-green-500';
    if (value >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBadge = (value: number) => {
    if (value >= 0.8) return 'bg-green-500/20 text-green-500 border-green-500/30';
    if (value >= 0.6) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    return 'bg-red-500/20 text-red-500 border-red-500/30';
  };

  const formatValue = (value: number, type: 'percentage' | 'time' | 'count' = 'percentage') => {
    switch (type) {
      case 'percentage':
        return `${Math.round(value * 100)}%`;
      case 'time':
        return `${Math.round(value)}ms`;
      case 'count':
        return Math.round(value).toString();
      default:
        return value.toFixed(2);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading system health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-500">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!healthMetrics) {
    return null;
  }

  // Compact mode for embedded use
  if (compactMode) {
    return (
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">System Health</span>
            </div>
            <Badge className={getHealthBadge(healthMetrics.overallHealth)}>
              {formatValue(healthMetrics.overallHealth)}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div className="text-center">
              <div className={getHealthColor(healthMetrics.accuracy)}>
                {formatValue(healthMetrics.accuracy)}
              </div>
              <div className="text-muted-foreground">Accuracy</div>
            </div>
            <div className="text-center">
              <div className={getHealthColor(healthMetrics.responseTime > 100 ? 0.5 : 0.9)}>
                {formatValue(healthMetrics.responseTime, 'time')}
              </div>
              <div className="text-muted-foreground">Response</div>
            </div>
            <div className="text-center">
              <div className={getHealthColor(healthMetrics.learningProgress)}>
                {formatValue(healthMetrics.learningProgress)}
              </div>
              <div className="text-muted-foreground">Learning</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full dashboard mode
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Health Monitor
          <Badge className={getHealthBadge(healthMetrics.overallHealth)}>
            {formatValue(healthMetrics.overallHealth)} Overall
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getHealthColor(healthMetrics.overallHealth)}`}>
              {formatValue(healthMetrics.overallHealth)}
            </div>
            <div className="text-sm text-muted-foreground">Overall Health</div>
            <Progress 
              value={healthMetrics.overallHealth * 100} 
              className="mt-1 h-1"
            />
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getHealthColor(healthMetrics.accuracy)}`}>
              {formatValue(healthMetrics.accuracy)}
            </div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
            <Progress 
              value={healthMetrics.accuracy * 100} 
              className="mt-1 h-1"
            />
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getHealthColor(healthMetrics.responseTime > 100 ? 0.5 : 0.9)}`}>
              {formatValue(healthMetrics.responseTime, 'time')}
            </div>
            <div className="text-sm text-muted-foreground">Response Time</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getHealthColor(healthMetrics.learningProgress)}`}>
              {formatValue(healthMetrics.learningProgress)}
            </div>
            <div className="text-sm text-muted-foreground">Learning Progress</div>
            <Progress 
              value={healthMetrics.learningProgress * 100} 
              className="mt-1 h-1"
            />
          </div>
        </div>

        {/* Detailed Metrics */}
        {healthMetrics.detailedMetrics && (
          <Tabs defaultValue="vibe" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vibe" className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Vibe
              </TabsTrigger>
              {showLocationMetrics && (
                <TabsTrigger value="location" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Location
                </TabsTrigger>
              )}
              <TabsTrigger value="performance" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                Database
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vibe" className="space-y-4">
              {renderVibeSystemCard(healthMetrics.detailedMetrics)}
            </TabsContent>

            {showLocationMetrics && (
              <TabsContent value="location" className="space-y-4">
                {renderLocationSystemCard(healthMetrics.detailedMetrics)}
              </TabsContent>
            )}

            <TabsContent value="performance" className="space-y-4">
              {renderPerformanceCard(healthMetrics.detailedMetrics)}
            </TabsContent>

            <TabsContent value="database" className="space-y-4">
              {renderDatabaseCard(healthMetrics.detailedMetrics)}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

// Helper functions to render detailed metric cards
function renderVibeSystemCard(metrics: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sensor Quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(metrics.sensorQuality || {}).map(([sensor, quality]) => (
            <div key={sensor} className="flex justify-between items-center">
              <span className="text-sm capitalize">{sensor}</span>
              <Badge variant="outline">{(quality as number * 100).toFixed(0)}%</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ML Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Confidence</span>
            <Badge variant="outline">{(metrics.mlConfidence * 100).toFixed(0)}%</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Feature Quality</span>
            <Badge variant="outline">{(metrics.featureQuality * 100).toFixed(0)}%</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function renderLocationSystemCard(metrics: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Location Accuracy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">GPS Quality</span>
            <Badge variant="outline">{(metrics.gpsAccuracy * 100).toFixed(0)}%</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Venue Detection</span>
            <Badge variant="outline">{(metrics.venueAccuracy * 100).toFixed(0)}%</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Proximity Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Active Events</span>
            <Badge variant="outline">{metrics.activeProximityEvents || 0}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Confidence Avg</span>
            <Badge variant="outline">{((metrics.proximityConfidence || 0) * 100).toFixed(0)}%</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function renderPerformanceCard(metrics: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Avg Response Time</span>
          <Badge variant="outline">{metrics.avgResponseTime || 0}ms</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Cache Hit Rate</span>
          <Badge variant="outline">{((metrics.cacheHitRate || 0) * 100).toFixed(0)}%</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Memory Usage</span>
          <Badge variant="outline">{((metrics.memoryUsage || 0) * 100).toFixed(0)}%</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function renderDatabaseCard(metrics: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Database Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Connection Status</span>
          <Badge variant="outline" className={metrics.dbConnected ? 'text-green-500' : 'text-red-500'}>
            {metrics.dbConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Query Performance</span>
          <Badge variant="outline">{metrics.avgQueryTime || 0}ms</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Records Processed</span>
          <Badge variant="outline">{metrics.recordsProcessed || 0}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}