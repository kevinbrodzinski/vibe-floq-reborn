import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart, ReferenceLine } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, Zap, Target } from 'lucide-react';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe } from '@/lib/vibes';
import { VIBES, VIBE_ORDER } from '@/lib/vibes';
import { cn } from '@/lib/utils';
import { format, subHours, startOfHour } from 'date-fns';

interface VibeFlowDataPoint {
  time: string;
  timestamp: number;
  vibe: string;
  intensity: number;
  confidence: number;
  duration: number;
  vibeIndex: number;
  formattedTime: string;
  transitionScore: number;
}

interface VibeFlowChartProps {
  className?: string;
  timeRange?: '24h' | '7d' | '30d';
  onVibeSelect?: (vibe: string, timestamp: number) => void;
  showPredictions?: boolean;
}

export const VibeFlowChart: React.FC<VibeFlowChartProps> = ({
  className,
  timeRange = '24h',
  onVibeSelect,
  showPredictions = true
}) => {
  const [selectedPoint, setSelectedPoint] = useState<VibeFlowDataPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<VibeFlowDataPoint | null>(null);
  const [viewMode, setViewMode] = useState<'flow' | 'intensity' | 'confidence'>('flow');
  
  // Generate realistic vibe flow data
  const generateVibeFlowData = (): VibeFlowDataPoint[] => {
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const interval = timeRange === '24h' ? 1 : timeRange === '7d' ? 4 : 12;
    
    const data: VibeFlowDataPoint[] = [];
    const vibeSequence = ['chill', 'focused', 'social', 'energetic', 'chill', 'romantic', 'reflective', 'playful'];
    
    for (let i = 0; i < hours; i += interval) {
      const timestamp = startOfHour(subHours(now, hours - i)).getTime();
      const vibeIndex = Math.floor(i / interval) % vibeSequence.length;
      const vibe = vibeSequence[vibeIndex];
      const intensity = 0.3 + Math.random() * 0.7;
      const confidence = 0.6 + Math.random() * 0.4;
      
      data.push({
        time: format(new Date(timestamp), timeRange === '24h' ? 'HH:mm' : timeRange === '7d' ? 'EEE' : 'MMM d'),
        timestamp,
        vibe,
        intensity,
        confidence,
        duration: interval,
        vibeIndex: VIBE_ORDER.indexOf(vibe as any) + 1,
        formattedTime: format(new Date(timestamp), 'MMM d, HH:mm'),
        transitionScore: Math.random() * 100
      });
    }
    
    return data;
  };

  const [flowData, setFlowData] = useState<VibeFlowDataPoint[]>([]);
  
  useEffect(() => {
    setFlowData(generateVibeFlowData());
  }, [timeRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload as VibeFlowDataPoint;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getVibeColor(data.vibe) }}
          />
          <span className="text-sm font-medium capitalize">{data.vibe}</span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between gap-4">
            <span>Time:</span>
            <span>{data.formattedTime}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Intensity:</span>
            <span>{Math.round(data.intensity * 100)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Confidence:</span>
            <span>{Math.round(data.confidence * 100)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Duration:</span>
            <span>{data.duration}h</span>
          </div>
        </div>
      </motion.div>
    );
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    
    const isSelected = selectedPoint?.timestamp === payload.timestamp;
    const isHovered = hoveredPoint?.timestamp === payload.timestamp;
    
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={isSelected ? 6 : isHovered ? 5 : 3}
        fill={getVibeColor(payload.vibe)}
        stroke="white"
        strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
        className="cursor-pointer drop-shadow-sm"
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setSelectedPoint(payload);
          onVibeSelect?.(payload.vibe, payload.timestamp);
        }}
        onMouseEnter={() => setHoveredPoint(payload)}
        onMouseLeave={() => setHoveredPoint(null)}
      />
    );
  };

  const getYAxisData = () => {
    switch (viewMode) {
      case 'intensity':
        return { dataKey: 'intensity', domain: [0, 1], label: 'Intensity' };
      case 'confidence':
        return { dataKey: 'confidence', domain: [0, 1], label: 'Confidence' };
      default:
        return { dataKey: 'vibeIndex', domain: [1, VIBE_ORDER.length], label: 'Vibe Flow' };
    }
  };

  const yAxisConfig = getYAxisData();

  return (
    <Card className={cn("p-4 bg-card/40 backdrop-blur-sm border-border/30", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Vibe Flow Analysis</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-1">
            {[
              { key: 'flow', label: 'Flow', icon: TrendingUp },
              { key: 'intensity', label: 'Intensity', icon: Zap },
              { key: 'confidence', label: 'Confidence', icon: Target }
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
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {timeRange}
          </Badge>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={flowData}>
            <defs>
              <linearGradient id="vibeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            
            <YAxis 
              domain={yAxisConfig.domain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              label={{ 
                value: yAxisConfig.label, 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Main area chart */}
            <Area
              type="monotone"
              dataKey={yAxisConfig.dataKey}
              stroke="rgb(99, 102, 241)"
              strokeWidth={2}
              fill="url(#vibeGradient)"
              fillOpacity={0.6}
            />
            
            {/* Overlay line with custom dots */}
            <Line
              type="monotone"
              dataKey={yAxisConfig.dataKey}
              stroke="transparent"
              strokeWidth={0}
              dot={<CustomDot />}
              activeDot={false}
            />
            
            {/* Current time reference line */}
            <ReferenceLine 
              x={flowData[flowData.length - 1]?.time} 
              stroke="hsl(var(--primary))" 
              strokeDasharray="2 2"
              strokeOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Selected Point Details */}
      <AnimatePresence>
        {selectedPoint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border/30"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ backgroundColor: getVibeColor(selectedPoint.vibe) }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">{selectedPoint.vibe}</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedPoint.formattedTime}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(selectedPoint.intensity * 100)}% intensity • 
                  {Math.round(selectedPoint.confidence * 100)}% confidence • 
                  {selectedPoint.duration}h duration
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPoint(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};