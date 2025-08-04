import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users, 
  Clock, 
  Zap,
  Target,
  Activity,
  Brain,
  ChevronRight
} from 'lucide-react';
import { VibeSystemIntegration, type EnhancedSocialContextData } from '@/lib/vibeAnalysis/VibeSystemIntegration';
import { getVibeColor } from '@/utils/getVibeColor';
import { getVibeIcon } from '@/utils/vibeIcons';
import { cn } from '@/lib/utils';

interface EnhancedHotspotPreviewProps {
  className?: string;
  onHotspotSelect?: (hotspotId: string) => void;
  onViewAll?: () => void;
  userLocation?: { lat: number; lng: number };
  currentVibe?: string;
}

export const EnhancedHotspotPreview: React.FC<EnhancedHotspotPreviewProps> = ({
  className,
  onHotspotSelect,
  onViewAll,
  userLocation = { lat: 37.7749, lng: -122.4194 }, // Default to SF
  currentVibe = 'chill'
}) => {
  const [socialData, setSocialData] = useState<EnhancedSocialContextData | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [vibeSystem] = useState(() => new VibeSystemIntegration());
  
  useEffect(() => {
    const fetchSocialData = async () => {
      try {
        // Mock friends data - in real implementation, this would come from friends API
        const mockFriends = [
          { id: '1', name: 'Alice', currentVibe: 'social', distance: '0.3 km', isActive: true },
          { id: '2', name: 'Bob', currentVibe: 'hype', distance: '0.8 km', isActive: true },
          { id: '3', name: 'Carol', currentVibe: 'chill', distance: '1.2 km', isActive: false }
        ];
        
        const data = await vibeSystem.getEnhancedSocialContextData(
          userLocation,
          currentVibe as any,
          mockFriends
        );
        setSocialData(data);
      } catch (error) {
        console.warn('Failed to fetch social data:', error);
      }
    };
    
    fetchSocialData();
    const interval = setInterval(fetchSocialData, 15000); // Update every 15 seconds
    
    return () => clearInterval(interval);
  }, [vibeSystem, userLocation, currentVibe]);
  
  if (!socialData) {
    return (
      <div className={cn('px-4', className)}>
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
  
  const topHotspots = socialData.hotspots.slice(0, 3);
  
  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising': return <TrendingUp className="w-3 h-3 text-green-400" />;
      case 'falling': return <TrendingDown className="w-3 h-3 text-red-400" />;
      default: return <Minus className="w-3 h-3 text-yellow-400" />;
    }
  };
  
  const getTrendColor = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'falling': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  return (
    <TooltipProvider>
      <motion.div
        layout
        initial={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        className={cn('px-4', className)}
      >
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Enhanced Vibe Hotspots
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                  AI-Powered
                </Badge>
              </CardTitle>
              {onViewAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="text-xs hover:bg-primary/10"
                >
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            
            {/* Summary Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>{socialData.hotspots.length} active clusters</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{socialData.hotspots.reduce((sum, h) => sum + h.socialMetrics.userCount, 0)} people</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="w-3 h-3" />
                <span>ML-enhanced</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {topHotspots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active hotspots nearby</p>
                <p className="text-xs">Check back later or explore different areas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topHotspots.map((hotspot, index) => (
                  <motion.div
                    key={hotspot.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                      selectedHotspot === hotspot.id 
                        ? "bg-primary/5 border-primary/30 shadow-sm" 
                        : "bg-card/40 border-border/20 hover:bg-card/60 hover:border-border/40"
                    )}
                    onClick={() => {
                      setSelectedHotspot(selectedHotspot === hotspot.id ? null : hotspot.id);
                      onHotspotSelect?.(hotspot.id);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {/* Vibe Icon with Intensity Ring */}
                        <div className="relative">
                          <div 
                            className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: getVibeColor(hotspot.dominantVibe) }}
                          >
                            <span className="text-sm">{getVibeIcon(hotspot.dominantVibe)}</span>
                          </div>
                          <div 
                            className="absolute -inset-1 rounded-full border opacity-30"
                            style={{ 
                              borderColor: getVibeColor(hotspot.dominantVibe),
                              borderWidth: Math.max(1, hotspot.intensity * 3)
                            }}
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm capitalize">
                              {hotspot.dominantVibe} Zone
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getTrendColor(hotspot.prediction.trend))}
                            >
                              {getTrendIcon(hotspot.prediction.trend)}
                              {hotspot.prediction.trend}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {hotspot.socialMetrics.userCount} people • {Math.round(hotspot.socialMetrics.averageStayTime)}min avg
                          </p>
                        </div>
                      </div>
                      
                      {/* Prediction Confidence */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-right">
                            <div className="text-sm font-bold text-primary">
                              {Math.round(hotspot.prediction.confidence * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">confidence</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">ML prediction confidence for this hotspot</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    {/* Metrics Row */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-1 bg-muted/20 rounded">
                            <div className="text-xs font-medium">
                              {Math.round(hotspot.intensity * 100)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Intensity</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Current activity intensity level</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-1 bg-muted/20 rounded">
                            <div className="text-xs font-medium">
                              {Math.round(hotspot.momentum * 100)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Momentum</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Rate of change in activity</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-1 bg-muted/20 rounded">
                            <div className="text-xs font-medium">
                              {Math.round(hotspot.stability * 100)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Stability</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">How consistent this hotspot is over time</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-1 bg-muted/20 rounded">
                            <div className="text-xs font-medium">
                              {Math.round(hotspot.diversity * 100)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Diversity</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Variety of vibes present (Shannon entropy)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    {/* Expanded Details */}
                    <AnimatePresence>
                      {selectedHotspot === hotspot.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-border/20 pt-2 mt-2"
                        >
                          <div className="space-y-2">
                            {/* Vibe Coherence Progress */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Vibe Coherence</span>
                                <span className="text-xs font-medium">
                                  {Math.round(hotspot.socialMetrics.vibeCoherence * 100)}%
                                </span>
                              </div>
                              <Progress 
                                value={hotspot.socialMetrics.vibeCoherence * 100}
                                className="h-1.5"
                                style={{
                                  '--progress-background': `${getVibeColor(hotspot.dominantVibe)}20`,
                                  '--progress-foreground': getVibeColor(hotspot.dominantVibe)
                                } as any}
                              />
                            </div>
                            
                            {/* Peak Time Prediction */}
                            {hotspot.prediction.peakTime && (
                              <div className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Predicted peak:</span>
                                </div>
                                <span className="font-medium">{hotspot.prediction.peakTime}</span>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to hotspot
                                }}
                              >
                                <Target className="w-3 h-3 mr-1" />
                                Navigate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Share hotspot
                                }}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                Share
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
                
                {/* Show More Button */}
                {socialData.hotspots.length > 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center pt-2"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onViewAll}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      +{socialData.hotspots.length - 3} more hotspots
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};