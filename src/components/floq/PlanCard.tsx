import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin, Clock, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { usePlanMeta } from '@/hooks/usePlanMeta';
import { formatCurrency, formatDuration } from '@/lib/format';
import { planStatusColor } from '@/lib/planStatusColor';
import { VibePill } from '@/components/floq/VibePill';
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
    creator?: {
      id: string;
      display_name?: string | null;
      username?: string | null;
      avatar_url?: string | null;
    } | null;
  };
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const nav = useNavigate();
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
    // Handle both "HH:mm" and "HH:mm:ss" formats
    const [hours, minutes] = plan.start_time.split(':').slice(0, 2);
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }, [plan.start_time]);

  return (
    <Card
      onClick={() => nav(`/plans/${plan.id}`)}
      className="cursor-pointer hover:shadow-lg transition-shadow group"
    >
      <CardHeader className="pb-1">
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-1 group-hover:text-primary">
            {plan.title}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={planStatusColor[plan.status] || planStatusColor.draft}
          >
            {plan.status}
          </Badge>
        </div>

        {plan.floqs?.title && (
          <span className="text-xs text-muted-foreground">
            Part of {plan.floqs.title}
          </span>
        )}

        {plan.creator && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage src={plan.creator.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {(plan.creator.display_name ?? plan.creator.username ?? 'U')[0]}
              </AvatarFallback>
            </Avatar>
            <span>
              Hosted by {plan.creator.display_name || (plan.creator.username && `@${plan.creator.username}`) || 'Unknown'}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {plan.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {plan.description}
          </p>
        )}

        {/* VIBE PILL */}
        {plan.vibe_tag && (
          <div className="flex">
            <VibePill vibe={plan.vibe_tag as Vibe} className="text-xs" />
          </div>
        )}

        {/* META ROW */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(plan.planned_at), 'MMM d')}
          </div>

          {startTimeText && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {startTimeText}
            </div>
          )}

          {meta && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {meta.participant_count}
              {plan.max_participants &&
                ` / ${plan.max_participants}`}
            </div>
          )}

          {meta && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {meta.total_stops} stop{meta.total_stops === 1 ? '' : 's'}
            </div>
          )}

          {durationText && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {durationText}
            </div>
          )}

          {budgetText && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {budgetText}
            </div>
          )}
        </div>

        {/* PROGRESS BAR */}
        {meta && meta.total_stops > 0 && progress < 100 && (
          <Progress value={progress} className="h-1 bg-muted" />
        )}
      </CardContent>
    </Card>
  );
};