import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin, Clock, DollarSign, Zap, Crown, CheckCircle, AlertCircle, Play, Pause, MessageCircle, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { usePlanMeta } from '@/hooks/usePlanMeta';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDuration } from '@/lib/format';
import { planStatusColor } from '@/lib/planStatusColor';
import { VibePill } from '@/components/floq/VibePill';
import { cn } from '@/lib/utils';
import type { PlanStatus } from '@/types/enums/planStatus';
import type { Vibe } from '@/types/enums/vibes';

interface PlanCardProps {
  plan: {
    id: string;
    title: string;
    description?: string | null;
    status: PlanStatus;
    planned_at: string;
    start_time?: string | null;
    end_time?: string | null;
    duration_hours?: number | null;
    max_participants?: number | null;
    floqs?: { title: string } | null;
    budget_per_person?: number | null;
    vibe_tag?: string | null;
    vibe_tags?: string[] | null;
    floq_id: string;
    is_joined?: boolean;
    is_private?: boolean;
    creator?: {
      id: string;
      display_name?: string | null;
      username?: string | null;
      avatar_url?: string | null;
    } | null;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    } | null;
  };
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: meta } = usePlanMeta(plan.id);
  const isJoined = plan.is_joined ?? false;
  
  const progress = useMemo(() => {
    if (!meta || meta.total_stops === 0) return 0;
    return Math.round(((meta.confirmed_stops ?? 0) / meta.total_stops) * 100);
  }, [meta]);

  const durationText = useMemo(() => {
    if (plan.duration_hours) return formatDuration(plan.duration_hours * 60);
    if (meta?.total_duration_minutes) return formatDuration(meta.total_duration_minutes);
    return null;
  }, [plan.duration_hours, meta]);

  const budgetValue = plan.budget_per_person ?? meta?.estimated_cost_per_person ?? 0;
  const budgetText = budgetValue > 0 ? formatCurrency(budgetValue) : null;

  const startTimeText = useMemo(() => {
    if (!plan.start_time) return null;
    const [hours, minutes] = plan.start_time.split(':').slice(0, 2);
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }, [plan.start_time]);

  // Real-time status indicators
  const isLive = plan.status === 'active' || plan.status === 'executing';
  const isStartingSoon = plan.status === 'active' && new Date(plan.planned_at) <= new Date(Date.now() + 30 * 60 * 1000);
  const isCreator = user?.id && plan.creator?.id === user.id;
  const hasUnreadMessages = false;
  const isPrivate = plan.is_private ?? false;
  const isInFuture = new Date(plan.planned_at) > new Date();

  // Get status icon and color
  const getStatusInfo = () => {
    switch (plan.status) {
      case 'active':
        return { icon: Play, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Active' };
      case 'executing':
        return { icon: Play, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Live Now' };
      case 'finalized':
        return { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Finalized' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-500/10', label: 'Completed' };
      case 'cancelled':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Cancelled' };
      case 'draft':
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Draft' };
      case 'closed':
        return { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Closed' };
      case 'invited':
        return { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Invited' };
      default:
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10', label: plan.status };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Determine card state for glow effects
  const isIdle = plan.status === 'draft' || plan.status === 'closed' || plan.status === 'cancelled';
  const hasPlanToday = plan.status === 'active' && !isLive;
  const isActiveFloq = isLive;
  const hasUnread = hasUnreadMessages;

  // Get glow class based on state
  const getGlowClass = () => {
    if (isActiveFloq) return 'card-live';
    if (hasPlanToday) return 'card-has-plan';
    if (hasUnread) return 'card-unread';
    return 'card-idle';
  };

  // Determine action button based on plan state
  const getActionButton = () => {
    if (isJoined) {
      return { text: 'Leave', variant: 'outline' as const };
    }
    
    if (isPrivate) {
      return { text: 'Request to Join', variant: 'outline' as const, icon: UserPlus };
    }
    
    if (isLive) {
      return { text: 'Join', variant: 'default' as const };
    }
    
    if (isInFuture) {
      return { text: 'RSVP', variant: 'default' as const };
    }
    
    return { text: 'Join', variant: 'outline' as const };
  };

  const actionButton = getActionButton();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        onClick={() => nav(`/plans/${plan.id}`)}
        className={cn(
          "cursor-pointer transition-all duration-300 group relative overflow-hidden",
          "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
          getGlowClass(),
          "rounded-3xl p-6"
        )}
      >
        {/* Top-left badge - Venue/Private */}
        <div className="absolute top-3 left-3 z-10">
          <Badge 
            variant="outline" 
            className="px-2 py-0.5 text-[10px] font-medium"
          >
            {isPrivate ? 'Private' : 'Venue'}
          </Badge>
        </div>

        {/* Top-right status badge */}
        <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-full ring-1 backdrop-blur-sm font-medium flex items-center gap-1 z-10"
             style={{
               backgroundColor: `${statusInfo.color.replace('text-', '')}20`,
               borderColor: `${statusInfo.color.replace('text-', '')}40`,
               color: statusInfo.color.replace('text-', '')
             }}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </div>

        {/* Main content */}
        <div className="relative z-10">
          {/* Title */}
          <h3 className="font-medium text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {plan.title}
          </h3>

          {/* Host message/description */}
          {plan.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {plan.description}
            </p>
          )}

          {/* Key attributes row */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            {plan.vibe_tag && (
              <span className="capitalize">{plan.vibe_tag}</span>
            )}
            <span>•</span>
            <span>{meta?.participant_count || 0} people</span>
            <span>•</span>
            <span>{isPrivate ? 'Private group' : 'Open group'}</span>
          </div>

          {/* Event details with icons */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            {plan.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{plan.location.address || 'Location TBD'}</span>
              </div>
            )}
            
            {startTimeText && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Starts at {startTimeText}</span>
                </div>
              </>
            )}
            
            {plan.vibe_tag && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Vibe Match 88%</span>
                </div>
              </>
            )}
          </div>

          {/* Host info */}
          {plan.creator && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <Avatar className="h-5 w-5">
                <AvatarImage src={plan.creator.avatar_url} />
                <AvatarFallback className="text-[8px]">
                  {(plan.creator.display_name ?? plan.creator.username ?? 'U')[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">
                Hosted by {plan.creator.display_name || (plan.creator.username && `@${plan.creator.username}`) || 'Unknown'}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button 
              variant={actionButton.variant}
              size="sm" 
              className="flex-1 h-9 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                // Handle action based on state
              }}
            >
              {actionButton.icon && <actionButton.icon className="w-4 h-4 mr-1" />}
              {actionButton.text}
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              className="h-9 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                // Handle share
              }}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};