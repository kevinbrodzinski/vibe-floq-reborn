
import React from 'react';
import { Plus, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanInviteButton } from '@/components/PlanInviteButton';
import { usePlansData } from '@/hooks/usePlansData';
import { PlansGrid } from './PlansGrid';
import { PlansFilters } from './PlansFilters';
import { EmptyState } from '@/components/EmptyState';
import { useNavigate } from 'react-router-dom';
import { zIndex } from '@/constants/z';
import { motion } from 'framer-motion';

export const PlansHub: React.FC = () => {
  const navigate = useNavigate();
  const {
    plans,
    categorizedPlans,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    counts
  } = usePlansData();

  const createNewPlan = () => {
    navigate('/plan/new');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Enhanced Header with Subtle Dark Theme */}
      <motion.div 
        className="sticky top-0 bg-transparent" 
        {...zIndex('uiHeader')}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className="w-8 h-8 text-gray-300" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Your Plans
              </h1>
              <p className="text-xs text-gray-400 font-medium">
                {counts.all} total plans • {counts.active} active
              </p>
            </div>
          </div>
          
          {/* Enhanced Action Buttons */}
          <div className="flex items-center gap-3">
            <PlanInviteButton />
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={createNewPlan}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                New Plan
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Content */}
      <div className="p-6 space-y-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PlansFilters
            current={filter}
            onChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            counts={counts}
          />
        </motion.div>

        {plans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <EmptyState
              title={counts.all === 0 ? "No Plans Yet" : "No Plans Match Your Search"}
              description={
                counts.all === 0
                  ? "Create your first plan to get started with organizing your activities."
                  : "Try adjusting your filters or search terms to see more plans."
              }
              animation="planning"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <PlansGrid plans={plans} />
          </motion.div>
        )}
      </div>
    </div>
  );
};
