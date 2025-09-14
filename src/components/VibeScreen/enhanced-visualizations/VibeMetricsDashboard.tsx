import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Clock, 
  Users, 
  Heart,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe } from '@/lib/vibes';
import { VIBES } from '@/lib/vibes';
import { cn } from '@/lib/utils';

interface MetricKPI {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
}

interface VibeMetricsDashboardProps {
  className?: string;
  realTimeMode?: boolean;
}

export const VibeMetricsDashboard: React.FC<VibeMetricsDashboardProps> = ({
  className,
  realTimeMode = true
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'trends'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Generate real-time KPI data
  const [kpiData, setKpiData] = useState<MetricKPI[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    const generateKPIs = (): MetricKPI[] => [
      {
        label: 'Vibe Accuracy',
        value: `${(75 + Math.random() * 20).toFixed(1)}%`,
        change: -2 + Math.random() * 4,
        trend: Math.random() > 0.5 ? 'up' : 'down',
        icon: Target,
        color: 'hsl(var(--primary))'
      },
      {
        label: 'Detection Confidence',
        value: `${(80 + Math.random() * 15).toFixed(1)}%`,
        change: -1 + Math.random() * 3,
        trend: 'up',
        icon: Brain,
        color: 'rgb(34, 197, 94)'
      },
      {
        label: 'Active Time',
        value: `${(6 + Math.random() * 4).toFixed(1)}h`,
        change: -0.5 + Math.random() * 1,
        trend: 'stable',
        icon: Clock,
        color: 'rgb(59, 130, 246)'
      },
      {
        label: 'Vibe Transitions',
        value: Math.floor(8 + Math.random() * 12),
        change: -2 + Math.random() * 6,
        trend: Math.random() > 0.3 ? 'up' : 'down',
        icon: Activity,
        color: 'rgb(168, 85, 247)'
      },
      {
        label: 'Social Connections',
        value: Math.floor(3 + Math.random() * 8),
        change: -1 + Math.random() * 3,
        trend: 'up',
        icon: Users,
        color: 'rgb(236, 72, 153)'
      },
      {
        label: 'Wellbeing Score',
        value: `${(70 + Math.random() * 25).toFixed(0)}/100`,
        change: -3 + Math.random() * 8,
        trend: Math.random() > 0.4 ? 'up' : 'stable',
        icon: Heart,
        color: 'rgb(239, 68, 68)'
      }
    ];

    const generateChartData = () => {
      const hours = timeRange === '1h' ? 12 : timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
      const data = [];
      
      for (let i = 0; i < hours; i++) {
        data.push({
          time: timeRange === '1h' ? `${String(i * 5).padStart(2, '0')}:00` :
                timeRange === '24h' ? `${String(i).padStart(2, '0')}:00` :
                timeRange === '7d' ? `Day ${i + 1}` : `Week ${i + 1}`,
          accuracy: 70 + Math.random() * 25,
          confidence: 75 + Math.random() * 20,
          activity: 30 + Math.random() * 70,
          wellbeing: 60 + Math.random() * 35,
          transitions: Math.floor(1 + Math.random() * 8)
        });
      }
      return data;
    };

    const generatePieData = () => {
      return VIBES.slice(0, 6).map(vibe => ({
        name: vibe.charAt(0).toUpperCase() + vibe.slice(1),
        value: Math.floor(10 + Math.random() * 40),
        color: vibeToHex(safeVibe(vibe))
      }));
    };

    setKpiData(generateKPIs());
    setChartData(generateChartData());
    setPieData(generatePieData());

    // Real-time updates
    if (realTimeMode) {
      const interval = setInterval(() => {
        setKpiData(generateKPIs());
        setChartData(generateChartData());
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [timeRange, realTimeMode]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-lg"
      >
        <div className="text-sm font-medium mb-2">{label}</div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="capitalize">{entry.dataKey}</span>
              </div>
              <span className="font-medium">
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                {entry.dataKey.includes('accuracy') || entry.dataKey.includes('confidence') || entry.dataKey.includes('wellbeing') ? '%' : ''}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Vibe Analytics</h2>
          {realTimeMode && (
            <Badge variant="outline" className="text-xs animate-pulse">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
              Live
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-1">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'detailed', label: 'Detailed', icon: LineChartIcon },
              { key: 'trends', label: 'Trends', icon: TrendingUp }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={viewMode === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(key as any)}
                className="h-7 px-2 text-xs"
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="flex bg-muted/50 rounded-lg p-1">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range as any)}
                className="h-7 px-2 text-xs"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiData.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-3 bg-card/40 backdrop-blur-sm border-border/30 hover:bg-card/60 transition-colors cursor-pointer"
                  onClick={() => setSelectedMetric(selectedMetric === kpi.label ? null : kpi.label)}>
              <div className="flex items-center justify-between mb-2">
                <kpi.icon 
                  className="h-4 w-4" 
                  style={{ color: kpi.color }}
                />
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  kpi.trend === 'up' ? "text-green-500" : 
                  kpi.trend === 'down' ? "text-red-500" : "text-muted-foreground"
                )}>
                  {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
                   kpi.trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
                   <div className="w-3 h-3" />}
                  {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-lg font-bold">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary Chart */}
        <Card className="lg:col-span-2 p-4 bg-card/40 backdrop-blur-sm border-border/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Performance Trends</h3>
            <Badge variant="secondary" className="text-xs">
              {timeRange} view
            </Badge>
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(34, 197, 94)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="rgb(34, 197, 94)" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                
                <YAxis 
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#accuracyGradient)"
                />
                
                <Area
                  type="monotone"
                  dataKey="confidence"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth={2}
                  fill="url(#confidenceGradient)"
                />
                
                <Line
                  type="monotone"
                  dataKey="wellbeing"
                  stroke="rgb(239, 68, 68)"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Vibe Distribution */}
        <Card className="p-4 bg-card/40 backdrop-blur-sm border-border/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Vibe Distribution</h3>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value}%`, name]}
                  labelFormatter={(label) => `${label} Vibe`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-1 mt-2">
            {pieData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name}</span>
                <span className="text-muted-foreground ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detailed Metrics (when metric is selected) */}
      <AnimatePresence>
        {selectedMetric && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">{selectedMetric} Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMetric(null)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Current Value</div>
                  <div className="text-lg font-bold">
                    {kpiData.find(k => k.label === selectedMetric)?.value}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">24h Change</div>
                  <div className={cn(
                    "text-lg font-bold flex items-center gap-1",
                    (kpiData.find(k => k.label === selectedMetric)?.change || 0) > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {(kpiData.find(k => k.label === selectedMetric)?.change || 0) > 0 ? "+" : ""}
                    {kpiData.find(k => k.label === selectedMetric)?.change?.toFixed(1)}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Trend</div>
                  <div className="flex items-center gap-2">
                    {kpiData.find(k => k.label === selectedMetric)?.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : kpiData.find(k => k.label === selectedMetric)?.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-muted-foreground" />
                    )}
                    <span className="text-sm capitalize">
                      {kpiData.find(k => k.label === selectedMetric)?.trend}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge 
                    variant={
                      (kpiData.find(k => k.label === selectedMetric)?.change || 0) > 5 ? "default" :
                      (kpiData.find(k => k.label === selectedMetric)?.change || 0) < -5 ? "destructive" : "secondary"
                    }
                    className="text-xs"
                  >
                    {(kpiData.find(k => k.label === selectedMetric)?.change || 0) > 5 ? "Excellent" :
                     (kpiData.find(k => k.label === selectedMetric)?.change || 0) < -5 ? "Needs Attention" : "Good"}
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};