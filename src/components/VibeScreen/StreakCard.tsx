import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Zap, Brain } from 'lucide-react';
import { useStreakDetection } from '@/hooks/useStreakDetection';

export const StreakCard: React.FC = () => {
  const { energyStreak, socialStreak, bothStreak, hasVisualStreak } = useStreakDetection();
  
  // Mock achievements data
  const achievements = [
    { id: 'flow_master', name: 'Flow Master', icon: '🌊', unlocked: bothStreak >= 3 },
    { id: 'energy_wizard', name: 'Energy Wizard', icon: '⚡', unlocked: energyStreak >= 5 },
    { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', unlocked: socialStreak >= 4 },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const hasAIReflection = bothStreak >= 2; // Mock condition

  return (
    <motion.div
      className="px-4 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="bg-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Progress & Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Streak Display */}
          {hasVisualStreak && (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl border border-orange-400/30">
              <div className="text-2xl">🔥</div>
              <div>
                <div className="text-sm font-semibold text-orange-300">
                  {bothStreak}-day streak!
                </div>
                <div className="text-xs text-orange-400/80">
                  Keep improving your vibe game
                </div>
              </div>
            </div>
          )}

          {/* Achievements Grid */}
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                className={`p-2 rounded-lg border text-center transition-all ${
                  achievement.unlocked
                    ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300'
                    : 'bg-muted/20 border-border/30 text-muted-foreground'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-lg mb-1">{achievement.icon}</div>
                <div className="text-xs font-medium">{achievement.name}</div>
              </motion.div>
            ))}
          </div>

          {/* AI Reflection CTA */}
          {hasAIReflection && (
            <Button
              variant="outline"
              className="w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30 text-purple-300 hover:bg-purple-500/30"
              onClick={() => console.log('Open AI reflection modal')}
            >
              <Brain className="w-4 h-4 mr-2" />
              AI Reflection available • 2 min read
            </Button>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-muted/20 rounded-lg">
              <div className="text-lg font-semibold text-blue-400">{energyStreak}</div>
              <div className="text-xs text-muted-foreground">Energy streak</div>
            </div>
            <div className="p-2 bg-muted/20 rounded-lg">
              <div className="text-lg font-semibold text-green-400">{socialStreak}</div>
              <div className="text-xs text-muted-foreground">Social streak</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};