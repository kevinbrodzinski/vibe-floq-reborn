import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarIcon, Search, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SearchAfterglowsParams } from '@/lib/supabase-helpers';

interface ArchiveSearchFiltersProps {
  filters: SearchAfterglowsParams;
  onFiltersChange: (filters: SearchAfterglowsParams) => void;
  onSearch: () => void;
  onClear: () => void;
}

const VIBE_OPTIONS = [
  'chill', 'excited', 'focused', 'creative', 'social', 'contemplative',
  'energetic', 'peaceful', 'adventurous', 'nostalgic'
];

const TAG_OPTIONS = [
  'work', 'social', 'exercise', 'food', 'travel', 'creative', 'learning',
  'family', 'friends', 'nature', 'music', 'art', 'relaxation'
];

export function ArchiveSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  onClear
}: ArchiveSearchFiltersProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    filters.startDate ? new Date(filters.startDate) : undefined
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    filters.endDate ? new Date(filters.endDate) : undefined
  );

  const updateFilters = (updates: Partial<SearchAfterglowsParams>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const addTag = (tag: string) => {
    const currentTags = filters.tags || [];
    if (!currentTags.includes(tag)) {
      updateFilters({ tags: [...currentTags, tag] });
    }
  };

  const removeTag = (tag: string) => {
    const currentTags = filters.tags || [];
    updateFilters({ tags: currentTags.filter(t => t !== tag) });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    updateFilters({ startDate: date ? format(date, 'yyyy-MM-dd') : null });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    updateFilters({ endDate: date ? format(date, 'yyyy-MM-dd') : null });
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof SearchAfterglowsParams];
    return value !== undefined && value !== null && value !== '' && 
           !(Array.isArray(value) && value.length === 0);
  });

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Search & Filters
        </h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search Query */}
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your afterglows..."
            value={filters.searchQuery || ''}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(
                "w-full justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Energy Range */}
      <div className="space-y-4">
        <Label>Energy Score Range</Label>
        <div className="px-3">
          <Slider
            value={[filters.minEnergy || 0, filters.maxEnergy || 100]}
            onValueChange={([min, max]) => updateFilters({ minEnergy: min, maxEnergy: max })}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <span>{filters.minEnergy || 0}</span>
            <span>{filters.maxEnergy || 100}</span>
          </div>
        </div>
      </div>

      {/* Dominant Vibe */}
      <div className="space-y-2">
        <Label>Dominant Vibe</Label>
        <Select
          value={filters.dominantVibe || ""}
          onValueChange={(value) => updateFilters({ dominantVibe: value || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any vibe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any vibe</SelectItem>
            {VIBE_OPTIONS.map(vibe => (
              <SelectItem key={vibe} value={vibe}>
                {vibe.charAt(0).toUpperCase() + vibe.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="space-y-3">
          {/* Current Tags */}
          {filters.tags && filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer">
                  {tag}
                  <X
                    className="w-3 h-3 ml-1"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
          
          {/* Available Tags */}
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.filter(tag => !filters.tags?.includes(tag)).map(tag => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => addTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Pinned Only */}
      <div className="flex items-center justify-between">
        <Label>Pinned only</Label>
        <Switch
          checked={filters.isPinned || false}
          onCheckedChange={(checked) => updateFilters({ isPinned: checked ? true : undefined })}
        />
      </div>

      {/* Search Button */}
      <Button onClick={onSearch} className="w-full">
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
    </Card>
  );
}