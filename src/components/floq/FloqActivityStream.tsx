import React, { useMemo } from 'react';
import { useFloqActivity, type MergedActivity } from '@/hooks/useFloqActivity';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Users, 
  Zap, 
  Calendar, 
  MapPin, 
  Heart,
  TrendingUp,
  Flame,
  Sparkles,
  Activity,
  Crown,
  UserPlus,
  UserMinus,
  Rocket,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveActivityDisplay } from '@/utils/activityHelpers';
import { cn } from '@/lib/utils';

interface FloqActivityStreamProps {
  floqId: string;
}

interface ActivityCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  events: MergedActivity[];
}

export const FloqActivityStream: React.FC<FloqActivityStreamProps> = ({ floqId }) => {
  const { activity, isLoading } = useFloqActivity(floqId);

  // Smart categorization of activities
  const categorizedActivities = useMemo(() => {
    const categories: ActivityCategory[] = [
      {
        id: 'social',
        name: 'Social Activity',
        icon: Users,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        events: []
      },
      {
        id: 'planning',
        name: 'Planning & Events',
        icon: Calendar,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        events: []
      },
      {
        id: 'vibe',
        name: 'Vibe Changes',
        icon: Sparkles,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        events: []
      },
      {
        id: 'management',
        name: 'Management',
        icon: Crown,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        events: []
      }
    ];

    // Ensure activity is an array before processing
    const activityArray = Array.isArray(activity) ? activity : [];

    activityArray.forEach(entry => {
      const display = resolveActivityDisplay(entry);
      
      // Categorize based on event type or content
      if (entry.source === 'flock_history') {
        switch (entry.event_type) {
          case 'joined':
          case 'left':
          case 'invited':
            categories[0].events.push(entry); // Social
            break;
          case 'plan_created':
          case 'activity_detected':
            categories[1].events.push(entry); // Planning
            break;
          case 'vibe_changed':
            categories[2].events.push(entry); // Vibe
            break;
          case 'created':
          case 'boosted':
          case 'merged':
          case 'split':
          case 'ended':
          case 'deleted':
            categories[3].events.push(entry); // Management
            break;
          default:
            categories[0].events.push(entry); // Default to social
        }
      } else {
        // Plan activity - categorize based on content
        if (display.content?.toLowerCase().includes('plan') || display.content?.toLowerCase().includes('event')) {
          categories[1].events.push(entry); // Planning
        } else if (display.content?.toLowerCase().includes('vibe') || display.content?.toLowerCase().includes('mood')) {
          categories[2].events.push(entry); // Vibe
        } else {
          categories[0].events.push(entry); // Default to social
        }
      }
    });

    return categories.filter(cat => cat.events.length > 0);
  }, [activity]);

  // Calculate activity score and hot periods
  const activityScore = useMemo(() => {
    const now = new Date();
    const activityArray = Array.isArray(activity) ? activity : [];
    const recentActivities = activityArray.filter(entry => {
      const activityTime = new Date(entry.created_at);
      const diffInMinutes = (now.getTime() - activityTime.getTime()) / (1000 * 60);
      return diffInMinutes < 60; // Last hour
    });

    const score = Math.min(recentActivities.length * 10, 100);
    const isHot = score >= 50;
    const isVeryHot = score >= 80;

    return { score, isHot, isVeryHot, recentCount: recentActivities.length };
  }, [activity]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!activity || !Array.isArray(activity) || activity.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">No activity yet</h4>
          <p className="text-sm text-muted-foreground">
            Activity will appear here when members interact with the floq.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Activity Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Activity Stream</h3>
          <Badge variant="secondary" className="text-xs">
            {activity.length} events
          </Badge>
        </div>
        
        {/* Activity Score Indicator */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {activityScore.isVeryHot && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-500">ON FIRE</span>
              </motion.div>
            )}
            {activityScore.isHot && !activityScore.isVeryHot && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-500">HOT</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {activityScore.recentCount} recent
            </span>
          </div>
        </div>
      </div>

      {/* Categorized Activity Sections */}
      {categorizedActivities.map((category) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {/* Category Header */}
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", category.bgColor)}>
              <category.icon className={cn("w-4 h-4", category.color)} />
            </div>
            <h4 className="text-sm font-medium">{category.name}</h4>
            <Badge variant="outline" className="text-xs">
              {category.events.length}
            </Badge>
          </div>
          
          {/* Category Events */}
          <div className="space-y-3 ml-8">
            {category.events.slice(0, 5).map((entry) => {
              const display = resolveActivityDisplay(entry);
              const isRecent = new Date(entry.created_at) > new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    isRecent && "bg-muted/30 border-primary/20"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={
                      entry.source === 'flock_history' 
                        ? entry.user_profile?.avatar_url || undefined 
                        : undefined
                    } />
                    <AvatarFallback className="text-xs">
                      {display.userName?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <display.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">
                        {display.userName}
                      </span>
                      <span className="text-muted-foreground">
                        {display.action}
                      </span>
                    </div>
                    
                    {display.content && (
                      <div className="mt-1 text-sm text-foreground">
                        "{display.content}"
                      </div>
                    )}
                    
                    {/* Show vibe badge for vibe changes */}
                    {display.isVibeChange && display.vibeValue && (
                      <Badge variant="outline" className="text-xs capitalize mt-1">
                        {display.vibeValue}
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </div>
                      {isRecent && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-xs text-green-500 font-medium">LIVE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {category.events.length > 5 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                +{category.events.length - 5} more events
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};