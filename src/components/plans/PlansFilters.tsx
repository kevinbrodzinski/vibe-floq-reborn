
import React, { useState } from 'react';
import { Search, Sparkles, Filter, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { PlanFilter, SortBy, SortOrder } from '@/hooks/useProgressivePlansData';

interface PlansFiltersProps {
  current: PlanFilter;
  onChange: (filter: PlanFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (sortOrder: SortOrder) => void;
  counts: {
    all: number;
    draft: number;
    active: number;
    completed: number;
    invited: number;
  };
}

export const PlansFilters: React.FC<PlansFiltersProps> = ({ 
  current, 
  onChange, 
  searchQuery, 
  onSearchChange,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  counts 
}) => {

  const options: { label: string; value: PlanFilter; count: number; icon?: React.ReactNode }[] = [
    { label: 'All', value: 'all', count: counts.all, icon: <Sparkles className="w-4 h-4" /> },
    { label: 'Draft', value: 'draft', count: counts.draft },
    { label: 'Active', value: 'active', count: counts.active },
    { label: 'Completed', value: 'completed', count: counts.completed },
    { label: 'Invited', value: 'invited', count: counts.invited },
  ];

  const sortOptions = [
    { value: 'name', label: 'Name A-Z', icon: 'A' },
    { value: 'name-desc', label: 'Name Z-A', icon: 'Z' },
    { value: 'date', label: 'Soonest First', icon: '↑' },
    { value: 'date-desc', label: 'Latest First', icon: '↓' },
    { value: 'type', label: 'By Type', icon: '●' },
    { value: 'distance', label: 'By Distance', icon: '📍' },
  ];

  // Get current sort option for display
  const getCurrentSortLabel = () => {
    const option = sortOptions.find(opt => {
      if (sortBy === 'name') {
        return opt.value === (sortOrder === 'desc' ? 'name-desc' : 'name');
      } else if (sortBy === 'date') {
        return opt.value === (sortOrder === 'desc' ? 'date-desc' : 'date');
      } else if (sortBy === 'type') {
        return opt.value === 'type';
      } else if (sortBy === 'distance') {
        return opt.value === 'distance';
      }
      return false;
    });
    return option?.label || 'Sort';
  };

  const handleSortChange = (value: string) => {
    if (value.includes('name')) {
      setSortBy('name');
      setSortOrder(value.includes('desc') ? 'desc' : 'asc');
    } else if (value.includes('date')) {
      setSortBy('date');
      setSortOrder(value.includes('desc') ? 'desc' : 'asc');
    } else if (value.includes('type')) {
      setSortBy('type');
      setSortOrder('asc');
    } else if (value.includes('distance')) {
      setSortBy('distance');
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Search input with Filter Button */}
      <motion.div 
        className="relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search your plans..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:border-gray-600/50 focus:ring-2 focus:ring-gray-600/20 transition-all duration-300"
            />
          </div>
          
          {/* Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-800/50 hover:border-gray-600/50 rounded-xl transition-all duration-300"
              >
                <Filter className="w-4 h-4 mr-2" />
                {getCurrentSortLabel()}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 min-w-[200px]">
              {sortOptions.map((option) => {
                const isSelected = getCurrentSortLabel() === option.label;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={cn(
                      "text-white hover:bg-gray-800/50 cursor-pointer",
                      isSelected && "bg-blue-600/20 text-blue-300"
                    )}
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.label}
                    {isSelected && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Enhanced Filter tabs */}
      <motion.div 
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {options.map((option, index) => (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap relative overflow-hidden group',
              current === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900/50 border border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-800/70'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            {option.icon && (
              <span className={cn(
                current === option.value ? 'text-white' : 'text-gray-400'
              )}>
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {option.count > 0 && (
              <Badge 
                variant={current === option.value ? "secondary" : "outline"} 
                className={cn(
                  "h-6 px-2 text-xs font-bold",
                  current === option.value 
                    ? "bg-white/20 text-white border-white/30" 
                    : "bg-gray-500/20 text-gray-400 border-gray-400/30"
                )}
              >
                {option.count}
              </Badge>
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};
