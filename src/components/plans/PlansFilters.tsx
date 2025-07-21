
import React from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { PlanFilter } from '@/hooks/usePlansData';

interface PlansFiltersProps {
  filter: PlanFilter;
  onFilterChange: (filter: PlanFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  planCount: number;
}

export const PlansFilters: React.FC<PlansFiltersProps> = ({
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  planCount
}) => {
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Input
        placeholder="Search plans..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => onFilterChange(value as PlanFilter)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="invited">Invited</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results Count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Showing</span>
        <Badge variant="secondary">{planCount}</Badge>
        <span>plans</span>
      </div>
    </div>
  );
};
