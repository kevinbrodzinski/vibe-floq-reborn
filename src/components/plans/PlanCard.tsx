
/**
 * src/components/plans/PlanCard.tsx
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Calendar, Clock, DollarSign, Edit2, MoreHorizontal, Trash2, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlanEditModal } from './PlanEditModal';

import { format } from 'date-fns';
import { formatCurrency, formatDuration } from '@/lib/format';
import { planStatusColor } from '@/lib/planStatusColor';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlanMeta } from '@/hooks/usePlanMeta';

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

    /* optional columns we don't render directly but must keep */
    floqs?: { title: string } | null;
    max_participants?: number | null;
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
  /*  Mutations                                                         */
  /* ------------------------------------------------------------------ */
  const deletePlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('floq_plans').delete().eq('id', plan.id);
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
      <Card
        onClick={(e) => {
          /* prevent navigation when clicking the action menu */
          if ((e.target as HTMLElement).closest('button,[role="menuitem"]')) return;
          navigate(`/plans/${plan.id}`);
        }}
        className="group relative cursor-pointer transition-shadow hover:shadow-md"
      >
        {/* ---------- Header ---------- */}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-lg transition-colors group-hover:text-primary">
              {plan.title}
            </CardTitle>

            {/* status badge & action menu */}
            <div className="flex items-center gap-1">
              <Badge className={planStatusColor[plan.status] ?? planStatusColor.draft}>
                {plan.status}
              </Badge>

              {/* ••• menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEdit(true);
                    }}
                  >
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDelete(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {plan.floqs?.title && (
            <p className="text-sm text-muted-foreground">Part of {plan.floqs.title}</p>
          )}
        </CardHeader>

        {/* ---------- Body ---------- */}
        <CardContent className="pt-0">
          {plan.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
          )}

          {/* ---------- Metadata chips ---------- */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {/* date */}
              <Chip icon={<Calendar />} label={format(new Date(plan.planned_at), 'MMM d, yyyy')} />

              {/* participants */}
              {meta?.participant_count ? (
                <Chip
                  icon={<Users />}
                  label={`${meta.participant_count}${plan.max_participants ? ` / ${plan.max_participants}` : ''} going`}
                />
              ) : null}

              {/* duration */}
              {meta?.total_duration_minutes ? (
                <Chip icon={<Clock />} label={formatDuration(meta.total_duration_minutes)} />
              ) : null}

              {/* budget */}
              {meta?.estimated_cost_per_person && meta.estimated_cost_per_person > 0 ? (
                <Chip
                  icon={<DollarSign />}
                  label={`${formatCurrency(meta.estimated_cost_per_person)}/person`}
                />
              ) : null}
            </div>

            {/* ---------- Progress bar ---------- */}
            {meta?.total_stops && meta.total_stops > 0 && progress < 100 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>
                    {meta.confirmed_stops ?? 0}/{meta.total_stops} stops
                  </span>
                </div>

                {/* Progress already has ARIA attributes; extra label for SR */}
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

/* ------------------------------------------------------------------ */
/*  Small helper component for the chips                              */
/* ------------------------------------------------------------------ */
interface ChipProps {
  icon: React.ReactNode;
  label: string;
}

const Chip: React.FC<ChipProps> = ({ icon, label }) => (
  <div className="flex items-center gap-1">
    {icon}
    <span>{label}</span>
  </div>
);
