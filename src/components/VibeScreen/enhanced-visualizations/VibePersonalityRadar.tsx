import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Palette, Brain, TrendingUp, Star, Sparkles } from 'lucide-react';
import { getVibeColor } from '@/utils/getVibeColor';
import { VIBES } from '@/lib/vibes';
import { cn } from '@/lib/utils';

interface VibePersonalityData {
  vibe: string;
  percentage: number;
  intensity: number;
  consistency: number;
  growth: number;
  recent: number;
  color: string;
  rank: number;
}

interface VibePersonalityRadarProps {
  className?: string;
  showComparison?: boolean;
  timeframe?: 'week' | 'month' | 'year';
}

export const VibePersonalityRadar: React.FC<VibePersonalityRadarProps> = ({
  className,
  showComparison = true,
  timeframe = 'month'
}) => {
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'radar' | 'bars' | 'trends'>('radar');
  
  // Generate realistic personality data
  const personalityData = useMemo(() => {
    const baseData = VIBES.map((vibe, index) => {
      const basePercentage = Math.random() * 100;
      const intensity = 0.3 + Math.random() * 0.7;
      const consistency = 0.4 + Math.random() * 0.6;
      const growth = -20 + Math.random() * 40; // -20% to +20% growth
      const recent = basePercentage * (0.8 + Math.random() * 0.4); // Recent activity variation
      
      return {
        vibe,
        percentage: basePercentage,
        intensity,
        consistency,
        growth,
        recent,
        color: getVibeColor(vibe),
        rank: index + 1
      };
    }).sort((a, b) => b.percentage - a.percentage);
    
    // Update ranks after sorting
    return baseData.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [timeframe]);

  const radarData = personalityData.map(item => ({
    vibe: item.vibe.charAt(0).toUpperCase() + item.vibe.slice(1),
    current: item.percentage,
    recent: item.recent,
    intensity: item.intensity * 100,
    consistency: item.consistency * 100,
    fullColor: item.color
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    const vibeData = personalityData.find(v => v.vibe.charAt(0).toUpperCase() + v.vibe.slice(1) === label);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-lg min-w-[200px]"
      >
        <div className="flex items-center gap-2 mb-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: vibeData?.color }}
          />
          <span className="text-sm font-semibold">{label}</span>
          <Badge variant="outline" className="text-xs">
            #{vibeData?.rank}
          </Badge>
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Overall:</span>
            <span className="font-medium">{Math.round(data.current)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Intensity:</span>
            <span className="font-medium">{Math.round(data.intensity)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Consistency:</span>
            <span className="font-medium">{Math.round(data.consistency)}%</span>
          </div>
          {vibeData && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Growth:</span>
              <span className={cn(
                "font-medium flex items-center gap-1",
                vibeData.growth > 0 ? "text-green-500" : "text-red-500"
              )}>
                {vibeData.growth > 0 ? "↗" : "↘"}
                {Math.abs(vibeData.growth).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const topVibes = personalityData.slice(0, 3);
  const dominantVibe = personalityData[0];

  return (
    <Card className={cn("p-4 bg-card/40 backdrop-blur-sm border-border/30", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Vibe Personality</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-1">
            {[
              { key: 'radar', label: 'Radar', icon: Brain },
              { key: 'bars', label: 'Bars', icon: TrendingUp },
              { key: 'trends', label: 'Trends', icon: Sparkles }
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
          
          <Badge variant="secondary" className="text-xs capitalize">
            {timeframe}
          </Badge>
        </div>
      </div>

      {/* Dominant Vibe Highlight */}
      <motion.div 
        className="mb-4 p-3 rounded-lg border border-border/30 bg-muted/20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div 
              className="w-8 h-8 rounded-full shadow-sm"
              style={{ backgroundColor: dominantVibe.color }}
            />
            <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 fill-current" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold capitalize">{dominantVibe.vibe}</span>
              <Badge variant="outline" className="text-xs">Dominant</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(dominantVibe.percentage)}% of your vibe time • 
              {Math.round(dominantVibe.intensity * 100)}% intensity
            </p>
          </div>
          <div className="text-right">
            <div className={cn(
              "text-xs font-medium flex items-center gap-1",
              dominantVibe.growth > 0 ? "text-green-500" : "text-red-500"
            )}>
              {dominantVibe.growth > 0 ? "↗" : "↘"}
              {Math.abs(dominantVibe.growth).toFixed(1)}%
            </div>
            <span className="text-xs text-muted-foreground">vs last {timeframe}</span>
          </div>
        </div>
      </motion.div>

      {/* Chart Area */}
      <div className="h-64 w-full mb-4">
        <AnimatePresence mode="wait">
          {viewMode === 'radar' && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="vibe" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Current period */}
                  <Radar
                    name="Current"
                    dataKey="current"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  
                  {/* Recent comparison */}
                  {showComparison && (
                    <Radar
                      name="Recent"
                      dataKey="recent"
                      stroke="hsl(var(--muted-foreground))"
                      fill="transparent"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  )}
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
          
          {viewMode === 'bars' && (
            <motion.div
              key="bars"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3 h-full overflow-y-auto"
            >
              {personalityData.map((vibe, index) => (
                <motion.div
                  key={vibe.vibe}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer",
                    selectedVibe === vibe.vibe ? "bg-muted/50" : "hover:bg-muted/20"
                  )}
                  onClick={() => setSelectedVibe(selectedVibe === vibe.vibe ? null : vibe.vibe)}
                >
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <span className="text-xs font-medium text-muted-foreground">#{vibe.rank}</span>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: vibe.color }}
                    />
                    <span className="text-sm font-medium capitalize">{vibe.vibe}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {Math.round(vibe.percentage)}%
                      </span>
                      <span className={cn(
                        "text-xs font-medium",
                        vibe.growth > 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {vibe.growth > 0 ? "+" : ""}{vibe.growth.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={vibe.percentage} 
                      className="h-2"
                      style={{ 
                        '--progress-background': vibe.color + '20',
                        '--progress-foreground': vibe.color
                      } as any}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
          
          {viewMode === 'trends' && (
            <motion.div
              key="trends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-3 gap-3 h-full"
            >
              {topVibes.map((vibe, index) => (
                <motion.div
                  key={vibe.vibe}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 rounded-lg border border-border/30 bg-muted/10"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: vibe.color }}
                    />
                    <span className="text-sm font-medium capitalize">{vibe.vibe}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-center">
                      <div className="text-lg font-bold">{Math.round(vibe.percentage)}%</div>
                      <div className="text-xs text-muted-foreground">Overall</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium">{Math.round(vibe.intensity * 100)}%</div>
                        <div className="text-muted-foreground">Intensity</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{Math.round(vibe.consistency * 100)}%</div>
                        <div className="text-muted-foreground">Consistency</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <Badge 
                        variant={vibe.growth > 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {vibe.growth > 0 ? "↗" : "↘"} {Math.abs(vibe.growth).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};