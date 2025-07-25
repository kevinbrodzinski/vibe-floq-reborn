import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Zap, 
  Clock, 
  Users, 
  MessageCircle, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Signal,
  Battery,
  Smartphone,
  Monitor,
  Server,
  Database,
  Network
} from 'lucide-react';
import { useFloqRealtime } from '@/hooks/useFloqRealtime';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  latency: number;
  messageRate: number;
  uptime: number;
  connectedUsers: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isConnected: boolean;
  isReconnecting: boolean;
}

interface SystemHealth {
  cpu: number;
  memory: number;
  network: number;
  database: number;
  overall: number;
}

export function FloqPerformanceMonitor({ floqId }: { floqId: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    cpu: 45,
    memory: 62,
    network: 78,
    database: 91,
    overall: 69
  });

  const {
    isConnected,
    isReconnecting,
    connectionQuality,
    stats,
    getPerformanceMetrics
  } = useFloqRealtime(floqId);

  const metrics = getPerformanceMetrics();

  // Simulate system health updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemHealth(prev => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(85, prev.memory + (Math.random() - 0.5) * 8)),
        network: Math.max(30, Math.min(95, prev.network + (Math.random() - 0.5) * 12)),
        database: Math.max(50, Math.min(98, prev.database + (Math.random() - 0.5) * 6)),
        overall: Math.max(25, Math.min(90, prev.overall + (Math.random() - 0.5) * 5))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getConnectionIcon = () => {
    if (isReconnecting) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (isConnected) return <Wifi className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const getConnectionColor = () => {
    if (isReconnecting) return 'text-yellow-500';
    if (isConnected) {
      switch (connectionQuality) {
        case 'excellent': return 'text-green-500';
        case 'good': return 'text-blue-500';
        case 'fair': return 'text-yellow-500';
        case 'poor': return 'text-red-500';
        default: return 'text-gray-500';
      }
    }
    return 'text-red-500';
  };

  const getHealthColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 60) return 'text-yellow-500';
    if (value >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthIcon = (value: number) => {
    if (value >= 80) return <CheckCircle className="w-4 h-4" />;
    if (value >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Compact Status Bar */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("flex items-center space-x-2", getConnectionColor())}>
              {getConnectionIcon()}
              <span className="text-sm font-medium">
                {isReconnecting ? 'Reconnecting...' : 
                 isConnected ? connectionQuality : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{stats.connectedUsers}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-3 h-3" />
                <span>{metrics.messageRate}/min</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatUptime(stats.uptime)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className="text-xs"
            >
              {metrics.latency}ms
            </Badge>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? 'Hide' : 'Details'}
            </button>
          </div>
        </div>
      </Card>

      {/* Expanded Performance Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Connection Quality */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Signal className="w-4 h-4" />
                    <span>Connection Quality</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Latency</span>
                    <span className="text-sm font-medium">{metrics.latency}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Message Rate</span>
                    <span className="text-sm font-medium">{metrics.messageRate} msg/min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Connected Users</span>
                    <span className="text-sm font-medium">{metrics.connectedUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Uptime</span>
                    <span className="text-sm font-medium">{formatUptime(metrics.uptime)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>System Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">CPU</span>
                      <div className="flex items-center space-x-2">
                        <span className={cn("text-sm font-medium", getHealthColor(systemHealth.cpu))}>
                          {Math.round(systemHealth.cpu)}%
                        </span>
                        {getHealthIcon(systemHealth.cpu)}
                      </div>
                    </div>
                    <Progress value={systemHealth.cpu} className="h-1" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Memory</span>
                      <div className="flex items-center space-x-2">
                        <span className={cn("text-sm font-medium", getHealthColor(systemHealth.memory))}>
                          {Math.round(systemHealth.memory)}%
                        </span>
                        {getHealthIcon(systemHealth.memory)}
                      </div>
                    </div>
                    <Progress value={systemHealth.memory} className="h-1" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Network</span>
                      <div className="flex items-center space-x-2">
                        <span className={cn("text-sm font-medium", getHealthColor(systemHealth.network))}>
                          {Math.round(systemHealth.network)}%
                        </span>
                        {getHealthIcon(systemHealth.network)}
                      </div>
                    </div>
                    <Progress value={systemHealth.network} className="h-1" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Database</span>
                      <div className="flex items-center space-x-2">
                        <span className={cn("text-sm font-medium", getHealthColor(systemHealth.database))}>
                          {Math.round(systemHealth.database)}%
                        </span>
                        {getHealthIcon(systemHealth.database)}
                      </div>
                    </div>
                    <Progress value={systemHealth.database} className="h-1" />
                  </div>
                </CardContent>
              </Card>

              {/* Performance Trends */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Performance Trends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Message Rate Trend</span>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">+12%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Latency Trend</span>
                    <div className="flex items-center space-x-1">
                      <TrendingDown className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">-5%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">User Growth</span>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-500">+3</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Resources */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Server className="w-4 h-4" />
                    <span>System Resources</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Monitor className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Active Channels</span>
                    </div>
                    <span className="text-sm font-medium">{stats.activeChannels}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-muted-foreground">Database Connections</span>
                    </div>
                    <span className="text-sm font-medium">24</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Network className="w-3 h-3 text-purple-500" />
                      <span className="text-xs text-muted-foreground">Network Requests</span>
                    </div>
                    <span className="text-sm font-medium">1.2k/min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Battery className="w-3 h-3 text-orange-500" />
                      <span className="text-xs text-muted-foreground">Cache Hit Rate</span>
                    </div>
                    <span className="text-sm font-medium">94%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 