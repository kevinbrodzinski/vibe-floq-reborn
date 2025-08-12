import React from 'react';
import { usePulseFilters, type UsePulseFiltersParams, type PulseFilterChip } from '@/hooks/usePulseFilters';
import { cn } from '@/lib/utils';

interface PulseFilterPillsProps extends UsePulseFiltersParams {
  selectedKeys?: string[];
  onSelect?: (key: string) => void;
  onToggle?: (key: string, selected: boolean) => void;
  maxVisible?: number;
  showPriority?: boolean;
  className?: string;
}

const getPriorityStyles = (priority?: 1 | 2 | 3) => {
  switch (priority) {
    case 1:
      return 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/40 text-blue-100 shadow-lg shadow-blue-500/20';
    case 2:
      return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/40 text-purple-100 shadow-md shadow-purple-500/15';
    case 3:
    default:
      return 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15 hover:border-white/30';
  }
};

const getSelectedStyles = (priority?: 1 | 2 | 3) => {
  switch (priority) {
    case 1:
      return 'bg-gradient-to-r from-blue-400 to-purple-400 border-blue-300 text-white shadow-lg shadow-blue-500/30 scale-105';
    case 2:
      return 'bg-gradient-to-r from-purple-400 to-pink-400 border-purple-300 text-white shadow-md shadow-purple-500/25 scale-105';
    case 3:
    default:
      return 'bg-white border-white/80 text-gray-900 shadow-md scale-105';
  }
};

export const PulseFilterPills: React.FC<PulseFilterPillsProps> = ({
  selectedKeys = [],
  onSelect,
  onToggle,
  maxVisible,
  showPriority = true,
  className,
  ...filterParams
}) => {
  const chips = usePulseFilters(filterParams);
  const visibleChips = maxVisible ? chips.slice(0, maxVisible) : chips;
  
  const handleChipClick = (chip: PulseFilterChip) => {
    const isSelected = selectedKeys.includes(chip.key);
    
    if (onToggle) {
      onToggle(chip.key, !isSelected);
    } else if (onSelect) {
      onSelect(chip.key);
    }
  };

  const renderChip = (chip: PulseFilterChip, index: number) => {
    const isSelected = selectedKeys.includes(chip.key);
    const baseStyles = 'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border backdrop-blur-sm';
    
    const priorityStyles = isSelected 
      ? getSelectedStyles(chip.priority)
      : getPriorityStyles(chip.priority);

    return (
      <button
        key={chip.key}
        onClick={() => handleChipClick(chip)}
        className={cn(baseStyles, priorityStyles)}
        title={chip.hint || chip.label}
        aria-pressed={isSelected}
      >
        {showPriority && chip.priority === 1 && '⭐ '}
        {showPriority && chip.priority === 2 && '✨ '}
        {chip.label}
      </button>
    );
  };

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {visibleChips.map((chip, index) => renderChip(chip, index))}
      
      {maxVisible && chips.length > maxVisible && (
        <span className="px-3 py-1.5 rounded-full text-xs font-medium text-white/50 bg-white/5 border border-white/10">
          +{chips.length - maxVisible} more
        </span>
      )}
    </div>
  );
};