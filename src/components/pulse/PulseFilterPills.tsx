import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Filter } from 'lucide-react';
import { PulseFilterOption } from '@/hooks/usePulseFilters';

interface PulseFilterPillsProps {
  availableFilters: PulseFilterOption[];
  selectedFilterKeys: string[];
  onToggleFilter: (filterKey: string) => void;
  maxVisible?: number;
  showToggleButton?: boolean;
  className?: string;
}

const getPriorityIcon = (priority: 1 | 2 | 3) => {
  switch (priority) {
    case 1:
      return <Star className="w-3 h-3" />;
    case 2:
      return <Sparkles className="w-3 h-3" />;
    default:
      return null;
  }
};

const getPriorityStyle = (priority: 1 | 2 | 3, isSelected: boolean) => {
  if (isSelected) {
    switch (priority) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-105';
      case 2:
        return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-md scale-102';
      default:
        return 'bg-white text-gray-900 shadow-md';
    }
  }

  switch (priority) {
    case 1:
      return 'bg-white/15 text-white border-yellow-400/30 hover:bg-yellow-400/20 hover:border-yellow-400/50';
    case 2:
      return 'bg-white/12 text-white/90 border-purple-400/20 hover:bg-purple-400/20 hover:border-purple-400/40';
    default:
      return 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20 hover:border-white/30';
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'core':
      return 'Core';
    case 'time':
      return 'Time-based';
    case 'day':
      return 'Day-specific';
    case 'vibe':
      return 'Vibe';
    case 'weather':
      return 'Weather';
    case 'context':
      return 'Smart';
    default:
      return category;
  }
};

export const PulseFilterPills: React.FC<PulseFilterPillsProps> = ({
  availableFilters,
  selectedFilterKeys,
  onToggleFilter,
  maxVisible = 12,
  showToggleButton = true,
  className = ''
}) => {
  const [showAll, setShowAll] = React.useState(false);

  const visibleFilters = showAll ? availableFilters : availableFilters.slice(0, maxVisible);
  const hasMoreFilters = availableFilters.length > maxVisible;

  // Group filters by category for better organization
  const filtersByCategory = React.useMemo(() => {
    const groups: Record<string, PulseFilterOption[]> = {};
    visibleFilters.forEach(filter => {
      if (!groups[filter.category]) {
        groups[filter.category] = [];
      }
      groups[filter.category].push(filter);
    });
    return groups;
  }, [visibleFilters]);

  const handleFilterClick = (filterKey: string) => {
    onToggleFilter(filterKey);
  };

  const renderFilterPill = (filter: PulseFilterOption) => {
    const isSelected = selectedFilterKeys.includes(filter.key);
    const priorityIcon = getPriorityIcon(filter.priority);
    const pillStyle = getPriorityStyle(filter.priority, isSelected);

    return (
      <motion.button
        key={filter.key}
        onClick={() => handleFilterClick(filter.key)}
        className={`
          px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 
          border flex items-center gap-1.5 whitespace-nowrap
          ${pillStyle}
        `}
        whileHover={{ 
          scale: isSelected ? 1.05 : 1.02,
          y: -1
        }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        layout
      >
        {priorityIcon}
        <span>{filter.label}</span>
      </motion.button>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/70" />
          <span className="text-sm text-white/70 font-medium">
            Filters {selectedFilterKeys.length > 0 && `(${selectedFilterKeys.length})`}
          </span>
        </div>
        
        {hasMoreFilters && showToggleButton && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-white/60 hover:text-white/80 transition-colors"
          >
            {showAll ? 'Show less' : `+${availableFilters.length - maxVisible} more`}
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {Object.entries(filtersByCategory).map(([category, filters]) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {/* Category label for organization (only show if multiple categories) */}
              {Object.keys(filtersByCategory).length > 1 && (
                <div className="text-xs text-white/50 font-medium uppercase tracking-wide">
                  {getCategoryLabel(category)}
                </div>
              )}
              
              {/* Category filters */}
              <div className="flex flex-wrap gap-2">
                {filters.map(renderFilterPill)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Selected filters summary */}
      {selectedFilterKeys.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs text-white/60"
        >
          <span>Active:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {selectedFilterKeys.slice(0, 3).map((key, index) => {
              const filter = availableFilters.find(f => f.key === key);
              return (
                <span key={key} className="text-white/80">
                  {filter?.label}
                  {index < Math.min(selectedFilterKeys.length, 3) - 1 && ', '}
                </span>
              );
            })}
            {selectedFilterKeys.length > 3 && (
              <span className="text-white/60">
                +{selectedFilterKeys.length - 3} more
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Priority Legend (optional, can be toggled) */}
      <div className="flex items-center gap-4 text-xs text-white/50 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-400" />
          <span>High priority</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Medium priority</span>
        </div>
        <div className="text-white/40">
          <span>Standard</span>
        </div>
      </div>
    </div>
  );
};