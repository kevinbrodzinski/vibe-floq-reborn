import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, MapPin, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrendData {
  id: string;
  category: 'social' | 'venue' | 'energy' | 'timing';
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  change: string;
  description: string;
  color: string;
}

interface TrendAnalysisWidgetProps {
  className?: string;
}

export const TrendAnalysisWidget: React.FC<TrendAnalysisWidgetProps> = ({ className }) => {
  const trends: TrendData[] = [
    {
      id: '1',
      category: 'social',
      title: 'Connection Rate',
      value: '3.2/day',
      trend: 'up',
      change: '+18%',
      description: 'More meaningful interactions',
      color: 'text-blue-600'
    },
    {
      id: '2',
      category: 'venue',
      title: 'Exploration Score',
      value: '78%',
      trend: 'up',
      change: '+12%',
      description: 'Trying new places',
      color: 'text-green-600'
    },
    {
      id: '3',
      category: 'energy',
      title: 'Peak Energy',
      value: '7:30 PM',
      trend: 'stable',
      change: '±15min',
      description: 'Consistent energy pattern',
      color: 'text-purple-600'
    },
    {
      id: '4',
      category: 'timing',
      title: 'Social Window',
      value: '4.2h',
      trend: 'up',
      change: '+30min',
      description: 'Longer social sessions',
      color: 'text-orange-600'
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'social': return Users;
      case 'venue': return MapPin;
      case 'energy': return Zap;
      case 'timing': return Clock;
      default: return TrendingUp;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return () => <div className="w-4 h-4 rounded-full bg-gray-300" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Weekly Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trends.map((trend, index) => {
          const CategoryIcon = getCategoryIcon(trend.category);
          const TrendIcon = getTrendIcon(trend.trend);
          
          return (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background ${trend.color}`}>
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{trend.title}</p>
                  <p className="text-xs text-muted-foreground">{trend.description}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{trend.value}</span>
                  <div className={`flex items-center gap-1 ${getTrendColor(trend.trend)}`}>
                    <TrendIcon className="w-3 h-3" />
                    <span className="text-xs font-medium">{trend.change}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        
        {/* Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall trend</span>
            <Badge className="bg-green-500/10 text-green-600 border-green-200">
              Improving ↗️
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};