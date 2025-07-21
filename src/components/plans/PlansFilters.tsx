
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanFilter } from '@/hooks/usePlansData';

interface PlansFiltersProps {
  current: PlanFilter;
  onChange: (filter: PlanFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
  counts 
}) => {
  const options: { label: string; value: PlanFilter; count: number }[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Draft', value: 'draft', count: counts.draft },
    { label: 'Active', value: 'active', count: counts.active },
    { label: 'Completed', value: 'completed', count: counts.completed },
    { label: 'Invited', value: 'invited', count: counts.invited },
  ];

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search plans..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              current === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
            {option.count > 0 && (
              <Badge 
                variant={current === option.value ? "secondary" : "outline"} 
                className="h-5 px-1.5 text-xs"
              >
                {option.count}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
