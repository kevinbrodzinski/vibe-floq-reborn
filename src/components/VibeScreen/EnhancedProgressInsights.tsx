import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Brain, 
  Zap, 
  Target, 
  Award, 
  Sparkles, 
  Activity,
  Calendar,
  Clock,
  BarChart3,
  ChevronRight,
  Star
} from 'lucide-react';
import { useStreakDetection } from '@/hooks/useStreakDetection';

interface InsightMetric {
  id: string;
  label: string;
  value: number;
  maxValue: number;
  color: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
}

export const EnhancedProgressInsights: React.FC = () => {
  const { energyStreak, socialStreak, bothStreak, hasVisualStreak } = useStreakDetection();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'insights'>('overview');
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  // Enhanced metrics with real-time feel
  const metrics: InsightMetric[] = [
    {
      id: 'consistency',
      label: 'Vibe Consistency',
      value: Math.min(95, 65 + (bothStreak * 5)),
      maxValue: 100,
      color: 'rgb(34, 197, 94)', // green-500
      icon: <Target className="w-4 h-4" />,
      trend: 'up',
      trendValue: 12
    },
    {
      id: 'social_sync',
      label: 'Social Synchrony',
      value: Math.min(88, 45 + (socialStreak * 8)),
      maxValue: 100,
      color: 'rgb(168, 85, 247)', // purple-500
      icon: <Activity className="w-4 h-4" />,
      trend: 'up',
      trendValue: 8
    },
    {
      id: 'energy_flow',
      label: 'Energy Flow',
      value: Math.min(92, 55 + (energyStreak * 6)),
      maxValue: 100,
      color: 'rgb(59, 130, 246)', // blue-500
      icon: <Zap className="w-4 h-4" />,
      trend: 'up',
      trendValue: 15
    },
    {
      id: 'mindfulness',
      label: 'Mindful Moments',
      value: 78,
      maxValue: 100,
      color: 'rgb(245, 158, 11)', // amber-500
      icon: <Brain className="w-4 h-4" />,
      trend: 'stable',
      trendValue: 2
    }
  ];

  // Premium achievements system
  const achievements: Achievement[] = [
    {
      id: 'vibe_master',
      title: 'Vibe Master',
      description: 'Maintain consistent vibes for 7 days',
      progress: bothStreak,
      maxProgress: 7,
      unlocked: bothStreak >= 7,
      rarity: 'epic',
      icon: '🌟'
    },
    {
      id: 'social_connector',
      title: 'Social Connector',
      description: 'Build meaningful connections',
      progress: socialStreak,
      maxProgress: 5,
      unlocked: socialStreak >= 5,
      rarity: 'rare',
      icon: '🤝'
    },
    {
      id: 'energy_guardian',
      title: 'Energy Guardian',
      description: 'Sustain high energy levels',
      progress: energyStreak,
      maxProgress: 6,
      unlocked: energyStreak >= 6,
      rarity: 'rare',
      icon: '⚡'
    },
    {
      id: 'flow_state',
      title: 'Flow State',
      description: 'Enter the zone consistently',
      progress: Math.min(10, bothStreak + 2),
      maxProgress: 10,
      unlocked: bothStreak >= 8,
      rarity: 'legendary',
      icon: '🌊'
    }
  ];

  // Animate values on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const animated = metrics.reduce((acc, metric) => ({
        ...acc,
        [metric.id]: metric.value
      }), {});
      setAnimatedValues(animated);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getRarityBorder = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-400/40';
      case 'epic': return 'border-purple-400/40';
      case 'rare': return 'border-blue-400/40';
      default: return 'border-gray-400/40';
    }
  };

  return (
    <motion.div
      className="px-2 mb-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
    >
      <Card className="bg-card/40 backdrop-blur-sm border-border/30 overflow-hidden">
        {/* Premium Header */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-400/20">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Vibe Analytics</h3>
                <p className="text-xs text-muted-foreground">Your personal growth insights</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 border-blue-400/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-muted/20 rounded-lg p-1 mb-4">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'achievements', label: 'Achievements', icon: Award },
              { key: 'insights', label: 'Insights', icon: Brain }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={selectedTab === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTab(key as any)}
                className={`flex-1 h-8 text-xs transition-all ${
                  selectedTab === key 
                    ? "bg-card shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 pt-0">
          <AnimatePresence mode="wait">
            {selectedTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {metrics.map((metric) => (
                    <motion.div
                      key={metric.id}
                      className="p-3 rounded-xl bg-card/60 border border-border/20"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground">{metric.icon}</div>
                          <span className="text-xs text-muted-foreground">{metric.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className={`w-3 h-3 ${
                            metric.trend === 'up' ? 'text-green-400' : 
                            metric.trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
                          }`} />
                          <span className={`text-xs ${
                            metric.trend === 'up' ? 'text-green-400' : 
                            metric.trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
                          }`}>
                            {metric.trend === 'up' ? '+' : metric.trend === 'down' ? '-' : ''}
                            {metric.trendValue}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold" style={{ color: metric.color }}>
                            {animatedValues[metric.id] || 0}%
                          </span>
                        </div>
                        <Progress 
                          value={animatedValues[metric.id] || 0} 
                          className="h-2"
                          style={{
                            '--progress-background': metric.color,
                          } as React.CSSProperties}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-400/20">
                    <div className="text-xl font-bold text-blue-400">{bothStreak}</div>
                    <div className="text-xs text-blue-300">Day Streak</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20">
                    <div className="text-xl font-bold text-green-400">{achievements.filter(a => a.unlocked).length}</div>
                    <div className="text-xs text-green-300">Unlocked</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/20">
                    <div className="text-xl font-bold text-purple-400">A+</div>
                    <div className="text-xs text-purple-300">Vibe Grade</div>
                  </div>
                </div>
              </motion.div>
            )}

            {selectedTab === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {achievements.map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    className={`p-3 rounded-xl border transition-all ${
                      achievement.unlocked
                        ? `bg-gradient-to-r ${getRarityColor(achievement.rarity)}/10 ${getRarityBorder(achievement.rarity)}`
                        : 'bg-card/40 border-border/20'
                    }`}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-semibold ${
                            achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {achievement.title}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              achievement.unlocked
                                ? `bg-gradient-to-r ${getRarityColor(achievement.rarity)}/20 ${getRarityBorder(achievement.rarity)}`
                                : 'bg-muted/20 border-border/20'
                            }`}
                          >
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(achievement.progress / achievement.maxProgress) * 100} 
                            className="flex-1 h-1.5"
                          />
                          <span className="text-xs text-muted-foreground">
                            {achievement.progress}/{achievement.maxProgress}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {selectedTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* AI Insights */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-400/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                      <Brain className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">AI Insights</h4>
                      <p className="text-xs text-muted-foreground">Personalized recommendations</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Star className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">Your social energy peaks around 7 PM</p>
                        <p className="text-xs text-muted-foreground">Consider scheduling social activities during this time</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Star className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">You maintain focus best in 90-minute blocks</p>
                        <p className="text-xs text-muted-foreground">Try the Pomodoro technique with extended sessions</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-400/20 text-purple-300 hover:bg-purple-500/20"
                  >
                    <Brain className="w-3 h-3 mr-2" />
                    Get Full AI Analysis
                    <ChevronRight className="w-3 h-3 ml-2" />
                  </Button>
                </div>

                {/* Time Insights */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-card/40 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-muted-foreground">Best Time</span>
                    </div>
                    <div className="text-lg font-bold text-blue-400">7:30 PM</div>
                    <div className="text-xs text-muted-foreground">Peak social energy</div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-card/40 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-muted-foreground">Best Day</span>
                    </div>
                    <div className="text-lg font-bold text-green-400">Friday</div>
                    <div className="text-xs text-muted-foreground">Highest consistency</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};