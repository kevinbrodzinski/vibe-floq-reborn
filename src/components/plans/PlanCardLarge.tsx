
/**
 * src/components/plans/PlanCard.tsx
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Calendar, Clock, DollarSign, Edit2, MoreHorizontal, Trash2, Users, MapPin, User, Tag, Crown, MessageCircle, Zap, Home, Sun, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlanEditModal } from './PlanEditModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { formatCurrency, formatDuration } from '@/lib/format';
import { planStatusColor } from '@/lib/planStatusColor';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlanMeta } from '@/hooks/usePlanMeta';
import { motion } from 'framer-motion';

import type { PlanStatus } from '@/types/enums/planStatus';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
export interface PlanCardProps {
  plan: {
    id: string;
    title: string;
    description?: string | null;
    status: PlanStatus;
    planned_at: string;
    start_time?: string | null;
    end_time?: string | null;
    max_participants?: number | null;
    budget_per_person?: number | null;
    vibe_tag?: string | null;
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
    venue?: {
      name: string;
      address?: string;
    } | null;

    /* optional columns we don't render directly but must keep */
    floqs?: { title: string } | null;
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /* dialogs & local state -------------------------------------------------- */
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* aggregated metadata ---------------------------------------------------- */
  const { data: meta } = usePlanMeta(plan.id);

  const progress = useMemo(() => {
    if (!meta?.total_stops) return 0;
    return Math.round(((meta.confirmed_stops ?? 0) / meta.total_stops) * 100);
  }, [meta]);

  /* ------------------------------------------------------------------ */
  /*  Computed Values                                                    */
  /* ------------------------------------------------------------------ */
  const planDate = new Date(plan.planned_at);
  const isLive = plan.status === 'executing' || plan.status === 'active';
  
  const getCountdownText = () => {
    const now = new Date();
    const timeUntil = planDate.getTime() - now.getTime();
    const daysUntil = Math.floor(timeUntil / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.floor((timeUntil % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    
    if (isToday(planDate)) {
      if (hoursUntil <= 0 && minutesUntil <= 0) return 'Starting soon';
      if (hoursUntil <= 0) return `Starts in ${minutesUntil} min`;
      return `Starts in ${hoursUntil}h ${minutesUntil}m`;
    } else if (isTomorrow(planDate)) {
      return 'Tomorrow';
    } else if (daysUntil > 0) {
      return `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`;
    } else {
      return formatDistanceToNow(planDate, { addSuffix: true });
    }
  };

  const getVibeIcon = () => {
    switch (plan.vibe_tag?.toLowerCase()) {
      case 'chill':
        return <Sun className="w-6 h-6 text-green-500" />;
      case 'social':
        return <Users className="w-6 h-6 text-blue-500" />;
      case 'hype':
        return <Zap className="w-6 h-6 text-purple-500" />;
      case 'romantic':
        return <Sparkles className="w-6 h-6 text-pink-500" />;
      default:
        return <Home className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (isLive) return 'text-green-500';
    switch (plan.status) {
      case 'draft': return 'text-gray-400';
      case 'finalized': return 'text-blue-500';
      case 'completed': return 'text-green-600';
      default: return 'text-gray-400';
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Mutations                                                         */
  /* ------------------------------------------------------------------ */
  const deletePlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('floq_plans').delete().eq('id', plan.id as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-floq-plans'] });
      toast({ title: 'Plan deleted', description: 'Your plan has been deleted.' });
    },
    onError: (err) =>
      toast({
        title: 'Failed to delete plan',
        description: (err as Error).message,
        variant: 'destructive',
      }),
  });

  const handleDelete = async () => {
    setDeleting(true);
    await deletePlan.mutateAsync().finally(() => {
      setDeleting(false);
      setShowDelete(false);
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Card
          onClick={(e) => {
            /* prevent navigation when clicking the action menu */
            if ((e.target as HTMLElement).closest('button,[role="menuitem"]')) return;
            navigate(`/plans/${plan.id}`);
          }}
          className="group relative cursor-pointer transition-all duration-300 bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600/50"
        >
          {/* ---------- Header ---------- */}
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-start gap-4">
              {/* Vibe Icon */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 border border-gray-600/50 flex items-center justify-center">
                  {getVibeIcon()}
                </div>
              </div>

              {/* Title and Details */}
              <div className="flex-1 min-w-0">
                <CardTitle className="line-clamp-1 text-xl font-bold text-white mb-2">
                  {plan.title}
                </CardTitle>
                
                {/* Vibe and Host Info */}
                <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                  {plan.vibe_tag && (
                    <>
                      <span className="capitalize font-medium">{plan.vibe_tag}</span>
                      <span className="text-gray-500">•</span>
                    </>
                  )}
                  <span>Hosted by {plan.creator?.display_name || plan.creator?.username || 'Unknown'}</span>
                </div>

                {/* Countdown */}
                <div className="text-sm text-blue-400 font-medium">
                  {getCountdownText()}
                </div>
              </div>

              {/* Status - No border, just color */}
              <div className={`text-sm font-medium ${getStatusColor()}`}>
                {isLive ? 'Live' : plan.status}
              </div>

              {/* Action Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800/30 hover:bg-gray-800/50 text-white hover:text-gray-300 rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEdit(true);
                    }}
                    className="text-white hover:bg-gray-800/50"
                  >
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDelete(true);
                    }}
                    className="text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          {/* ---------- Body ---------- */}
          <CardContent className="pt-0 relative z-10 space-y-4">
            {/* Description */}
            {plan.description && (
              <p className="line-clamp-2 text-sm text-gray-300 leading-relaxed">{plan.description}</p>
            )}

            {/* Next Event Info */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-white">
                Next: {plan.venue?.name || 'Location TBD'} @ {plan.start_time || 'Time TBD'}
              </span>
            </div>

            {/* Location Details */}
            {(plan.venue?.address || plan.location?.address) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300 truncate">
                  {plan.venue?.address || plan.location?.address}
                </span>
              </div>
            )}

            {/* Budget */}
            {plan.budget_per_person && plan.budget_per_person > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">
                  {formatCurrency(plan.budget_per_person)} per person
                </span>
              </div>
            )}

            {/* Progress bar for active plans */}
            {meta?.total_stops && meta.total_stops > 0 && progress < 100 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span>{meta.confirmed_stops ?? 0}/{meta.total_stops} stops</span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden" 
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/plans/${plan.id}`);
                }}
              >
                Join
              </Button>
              
              <Button 
                size="sm"
                variant="outline"
                className="flex-1 bg-gray-800/50 border border-gray-600/50 text-white hover:bg-gray-800/70 hover:border-gray-500/50 rounded-lg font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle chat
                }}
              >
                Chat
              </Button>
              
              <Button 
                size="sm"
                variant="outline"
                className="flex-1 bg-gray-800/50 border border-gray-600/50 text-white hover:bg-gray-800/70 hover:border-gray-500/50 rounded-lg font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle boost
                }}
              >
                Boost
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---------- Modals & Dialogs ---------- */}
      {showEdit && <PlanEditModal plan={plan} onClose={() => setShowEdit(false)} />}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete Plan"
        description="Are you sure you want to delete this plan? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleting}
      />
    </>
  );
};
