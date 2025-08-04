import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Brain, 
  MapPin, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Database,
  Cpu,
  MemoryStick,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { VibeSystemIntegration } from '@/lib/vibeAnalysis/VibeSystemIntegration';
import { LocationEnhancedVibeSystem } from '@/lib/vibeAnalysis/LocationEnhancedVibeSystem';
import { cn } from '@/lib/utils';

interface SystemHealthMetrics {
  overallHealth: number;
  accuracy: number;
  responseTime: number;
  learningProgress: number;
  recommendations: string[];
  
  // Detailed metrics
  vibeSystem: {
    mlAccuracy: number;
    sensorFusionQuality: number;
    userLearningEffectiveness: number;
    predictionConfidence: number;
    errorRate: number;
  };
  
  locationSystem?: {
    venueDetectionAccuracy: number;
    proximityAccuracy: number;
    geofenceReliability: number;
    batteryImpact: number;
    signalQuality: number;
  };
  
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
    cacheHitRate: number;
    backgroundProcessingLoad: number;
  };
  
  database: {
    queryPerformance: number;
    connectionHealth: number;
    indexEfficiency: number;
    dataIntegrity: number;
  };
}

interface SystemHealthMonitorProps {
  className?: string;
  showLocationMetrics?: boolean;
  refreshInterval?: number;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  className,
  showLocationMetrics = true,
  refreshInterval = 5000
}) => {
  const [vibeSystem] = useState(() => 
    showLocationMetrics ? new LocationEnhancedVibeSystem() : new VibeSystemIntegration()
  );
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const fetchHealthMetrics = async () => {
    setIsRefreshing(true);
    try {
      // Get base health metrics
      const baseMetrics = vibeSystem.getSystemHealthMetrics();
      
      // Simulate additional detailed metrics (in real implementation, these would come from actual monitoring)
      const detailedMetrics: SystemHealthMetrics = {
        ...baseMetrics,
        vibeSystem: {
          mlAccuracy: baseMetrics.accuracy,
          sensorFusionQuality: 0.85 + Math.random() * 0.1,
          userLearningEffectiveness: baseMetrics.learningProgress,
          predictionConfidence: 0.78 + Math.random() * 0.15,
          errorRate: 0.05 + Math.random() * 0.03
        },
        locationSystem: showLocationMetrics ? {
          venueDetectionAccuracy: 0.82 + Math.random() * 0.12,
          proximityAccuracy: 0.88 + Math.random() * 0.08,
          geofenceReliability: 0.95 + Math.random() * 0.04,
          batteryImpact: 0.12 + Math.random() * 0.08,
          signalQuality: 0.75 + Math.random() * 0.2
        } : undefined,
        performance: {
          memoryUsage: 0.45 + Math.random() * 0.2,
          cpuUsage: 0.25 + Math.random() * 0.15,
          networkLatency: 50 + Math.random() * 30,
          cacheHitRate: 0.85 + Math.random() * 0.1,
          backgroundProcessingLoad: 0.15 + Math.random() * 0.1
        },
        database: {
          queryPerformance: 0.9 + Math.random() * 0.08,
          connectionHealth: 0.98 + Math.random() * 0.02,
          indexEfficiency: 0.87 + Math.random() * 0.1,
          dataIntegrity: 0.99 + Math.random() * 0.01
        }
      };
      
      setHealthMetrics(detailedMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch health metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchHealthMetrics();
    const interval = setInterval(fetchHealthMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  if (!healthMetrics) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted/20 rounded w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted/20 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };
  
  const renderOverviewCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            System Health Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchHealthMetrics}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Health Score */}
        <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
          <div className={cn("text-4xl font-bold", getHealthColor(healthMetrics.overallHealth))}>
            {healthMetrics.overallHealth}/100
          </div>
          <div className="text-sm text-muted-foreground mt-1">Overall System Health</div>
          <Progress 
            value={healthMetrics.overallHealth} 
            className="mt-2 h-2"
          />
        </div>
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-card/40 rounded-lg">
            <div className={cn("text-2xl font-bold", getHealthColor(healthMetrics.accuracy * 100))}>
              {Math.round(healthMetrics.accuracy * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
          
          <div className="text-center p-3 bg-card/40 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {healthMetrics.responseTime}ms
            </div>
            <div className="text-xs text-muted-foreground">Response Time</div>
          </div>
          
          <div className="text-center p-3 bg-card/40 rounded-lg">
            <div className={cn("text-2xl font-bold", getHealthColor(healthMetrics.learningProgress * 100))}>
              {Math.round(healthMetrics.learningProgress * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Learning Progress</div>
          </div>
          
          <div className="text-center p-3 bg-card/40 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">
              {healthMetrics.recommendations.length}
            </div>
            <div className="text-xs text-muted-foreground">Active Issues</div>
          </div>
        </div>
        
        {/* Recommendations */}
        {healthMetrics.recommendations.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">System Recommendations:</div>
                <ul className="text-sm space-y-1">
                  {healthMetrics.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
  
  const renderVibeSystemCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Vibe Detection System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">ML Accuracy</span>
              <div className="flex items-center gap-2">
                {getHealthIcon(healthMetrics.vibeSystem.mlAccuracy * 100)}
                <span className="font-medium">{Math.round(healthMetrics.vibeSystem.mlAccuracy * 100)}%</span>
              </div>
            </div>
            <Progress value={healthMetrics.vibeSystem.mlAccuracy * 100} className="h-2" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Sensor Fusion Quality</span>
              <div className="flex items-center gap-2">
                {getHealthIcon(healthMetrics.vibeSystem.sensorFusionQuality * 100)}
                <span className="font-medium">{Math.round(healthMetrics.vibeSystem.sensorFusionQuality * 100)}%</span>
              </div>
            </div>
            <Progress value={healthMetrics.vibeSystem.sensorFusionQuality * 100} className="h-2" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Learning Effectiveness</span>
              <div className="flex items-center gap-2">
                {getHealthIcon(healthMetrics.vibeSystem.userLearningEffectiveness * 100)}
                <span className="font-medium">{Math.round(healthMetrics.vibeSystem.userLearningEffectiveness * 100)}%</span>
              </div>
            </div>
            <Progress value={healthMetrics.vibeSystem.userLearningEffectiveness * 100} className="h-2" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Prediction Confidence</span>
              <div className="flex items-center gap-2">
                {getHealthIcon(healthMetrics.vibeSystem.predictionConfidence * 100)}
                <span className="font-medium">{Math.round(healthMetrics.vibeSystem.predictionConfidence * 100)}%</span>
              </div>
            </div>
            <Progress value={healthMetrics.vibeSystem.predictionConfidence * 100} className="h-2" />
          </div>
        </div>
        
        <div className="pt-3 border-t border-border/20">
          <div className="flex items-center justify-between text-sm">
            <span>Error Rate</span>
            <Badge variant={healthMetrics.vibeSystem.errorRate < 0.05 ? "default" : "destructive"}>
              {(healthMetrics.vibeSystem.errorRate * 100).toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  const renderLocationSystemCard = () => (
    showLocationMetrics && healthMetrics.locationSystem && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-secondary" />
            Location System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Venue Detection</span>
                <div className="flex items-center gap-2">
                  {getHealthIcon(healthMetrics.locationSystem.venueDetectionAccuracy * 100)}
                  <span className="font-medium">{Math.round(healthMetrics.locationSystem.venueDetectionAccuracy * 100)}%</span>
                </div>
              </div>
              <Progress value={healthMetrics.locationSystem.venueDetectionAccuracy * 100} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Proximity Accuracy</span>
                <div className="flex items-center gap-2">
                  {getHealthIcon(healthMetrics.locationSystem.proximityAccuracy * 100)}
                  <span className="font-medium">{Math.round(healthMetrics.locationSystem.proximityAccuracy * 100)}%</span>
                </div>
              </div>
              <Progress value={healthMetrics.locationSystem.proximityAccuracy * 100} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Geofence Reliability</span>
                <div className="flex items-center gap-2">
                  {getHealthIcon(healthMetrics.locationSystem.geofenceReliability * 100)}
                  <span className="font-medium">{Math.round(healthMetrics.locationSystem.geofenceReliability * 100)}%</span>
                </div>
              </div>
              <Progress value={healthMetrics.locationSystem.geofenceReliability * 100} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Signal Quality</span>
                <div className="flex items-center gap-2">
                  {getHealthIcon(healthMetrics.locationSystem.signalQuality * 100)}
                  <span className="font-medium">{Math.round(healthMetrics.locationSystem.signalQuality * 100)}%</span>
                </div>
              </div>
              <Progress value={healthMetrics.locationSystem.signalQuality * 100} className="h-2" />
            </div>
          </div>
          
          <div className="pt-3 border-t border-border/20">
            <div className="flex items-center justify-between text-sm">
              <span>Battery Impact</span>
              <Badge variant={healthMetrics.locationSystem.batteryImpact < 0.15 ? "default" : "destructive"}>
                {(healthMetrics.locationSystem.batteryImpact * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  );
  
  const renderPerformanceCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <MemoryStick className="w-3 h-3" />
                <span>Memory Usage</span>
              </div>
              <span className="font-medium">{Math.round(healthMetrics.performance.memoryUsage * 100)}%</span>
            </div>
            <Progress value={healthMetrics.performance.memoryUsage * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                <span>CPU Usage</span>
              </div>
              <span className="font-medium">{Math.round(healthMetrics.performance.cpuUsage * 100)}%</span>
            </div>
            <Progress value={healthMetrics.performance.cpuUsage * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                <span>Network Latency</span>
              </div>
              <span className="font-medium">{Math.round(healthMetrics.performance.networkLatency)}ms</span>
            </div>
            <Progress value={Math.min(100, (100 - healthMetrics.performance.networkLatency / 2))} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>Cache Hit Rate</span>
              </div>
              <span className="font-medium">{Math.round(healthMetrics.performance.cacheHitRate * 100)}%</span>
            </div>
            <Progress value={healthMetrics.performance.cacheHitRate * 100} className="h-2" />
          </div>
        </div>
        
        <div className="pt-3 border-t border-border/20">
          <div className="flex items-center justify-between text-sm">
            <span>Background Processing Load</span>
            <Badge variant={healthMetrics.performance.backgroundProcessingLoad < 0.2 ? "default" : "secondary"}>
              {Math.round(healthMetrics.performance.backgroundProcessingLoad * 100)}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  const renderDatabaseCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-green-400" />
          Database Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Query Performance</span>
              <span className="font-medium">{Math.round(healthMetrics.database.queryPerformance * 100)}%</span>
            </div>
            <Progress value={healthMetrics.database.queryPerformance * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Connection Health</span>
              <span className="font-medium">{Math.round(healthMetrics.database.connectionHealth * 100)}%</span>
            </div>
            <Progress value={healthMetrics.database.connectionHealth * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Index Efficiency</span>
              <span className="font-medium">{Math.round(healthMetrics.database.indexEfficiency * 100)}%</span>
            </div>
            <Progress value={healthMetrics.database.indexEfficiency * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Data Integrity</span>
              <span className="font-medium">{Math.round(healthMetrics.database.dataIntegrity * 100)}%</span>
            </div>
            <Progress value={healthMetrics.database.dataIntegrity * 100} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {renderOverviewCard()}
      
      <Tabs defaultValue="systems" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>
        
        <TabsContent value="systems" className="space-y-4">
          {renderVibeSystemCard()}
          {renderLocationSystemCard()}
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          {renderPerformanceCard()}
        </TabsContent>
        
        <TabsContent value="database" className="space-y-4">
          {renderDatabaseCard()}
        </TabsContent>
      </Tabs>
    </div>
  );
};