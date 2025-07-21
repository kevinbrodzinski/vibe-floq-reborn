
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanInviteButton } from '@/components/PlanInviteButton';
import { usePlansData } from '@/hooks/usePlansData';
import { PlansGrid } from './PlansGrid';
import { PlansFilters } from './PlansFilters';
import { EmptyState } from '@/components/EmptyState';

export const PlansHub: React.FC = () => {
  const {
    plans,
    categorizedPlans,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    createNewPlan,
    counts
  } = usePlansData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-semibold text-foreground">Your Plans</h1>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <PlanInviteButton />
            <Button
              onClick={createNewPlan}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-24">
        <PlansFilters
          current={filter}
          onChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          counts={counts}
        />

        {plans.length === 0 ? (
          <EmptyState
            title={counts.all === 0 ? "No Plans Yet" : "No Plans Match Your Search"}
            description={
              counts.all === 0
                ? "Create your first plan to get started with organizing your activities."
                : "Try adjusting your filters or search terms to see more plans."
            }
            animation="planning"
          />
        ) : (
          <PlansGrid plans={plans} />
        )}
      </div>
    </div>
  );
};
