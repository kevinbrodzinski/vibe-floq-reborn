import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { useFloqSearch } from '@/hooks/useFloqSearch';
import { useEnhancedGeolocation } from '@/hooks/useEnhancedGeolocation';
import { formatDistanceMeters } from '@/utils/formatDistanceMeters';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from 'use-debounce';
import type { FloqSearchResult } from '@/types/SearchFilters';

interface SearchBarWithTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: FloqSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchBarWithTypeahead({
  value,
  onChange,
  onSelect,
  placeholder = "Search floqs...",
  disabled = false,
  className
}: SearchBarWithTypeaheadProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const { coords } = useEnhancedGeolocation();
  
  const debouncedOnChange = useDebouncedCallback(onChange, 250, { leading: false });
  
  // Use search hook for typeahead with basic filters
  const { 
    data: suggestions = [], 
    isLoading: isSearching 
  } = useFloqSearch(
    coords,
    {
      query: value,
      radiusKm: 100, // Wide radius for suggestions
      vibes: [], // No vibe filter for suggestions
      timeRange: [new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] // Next 30 days
    },
    // Only search when we have coords, a query, and suggestions are shown
    Boolean(value.trim() && showSuggestions && coords)
  );

  // Filter suggestions to only show relevant ones
  const filteredSuggestions = suggestions.slice(0, 5); // Limit to 5 suggestions

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    debouncedOnChange(newValue);
    setSelectedIndex(-1);
    setShowSuggestions(newValue.trim().length > 0);
  };

  const handleInputFocus = () => {
    if (value.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSuggestionClick = (suggestion: FloqSearchResult) => {
    onChange(suggestion.title);
    setShowSuggestions(false);
    onSelect?.(suggestion);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          handleSuggestionClick(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Format distance for display
  const getDistanceText = (distanceM: number) => {
    return formatDistanceMeters(distanceM);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? "suggestions-list" : undefined}
          className={cn(
            "pl-10 pr-10 bg-background/50",
            value && "pr-16"
          )}
        />
        
        {/* Loading indicator */}
        {isSearching && value.trim() && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        
        {/* Clear button */}
        {value && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/50"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <Card 
          id="suggestions-list"
          ref={suggestionsRef}
          role="listbox"
          tabIndex={-1}
          className="absolute top-full left-0 right-0 mt-1 z-50 overflow-hidden shadow-lg border bg-background"
        >
          <div className="max-h-80 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                role="option"
                aria-selected={selectedIndex === index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  "flex items-center justify-between p-3 cursor-pointer transition-colors border-b border-border/50 last:border-b-0",
                  "hover:bg-muted/50",
                  selectedIndex === index && "bg-muted"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {suggestion.title}
                    </span>
                    <Badge 
                      variant="outline" 
                      className="text-xs capitalize shrink-0"
                    >
                      {suggestion.primary_vibe}
                    </Badge>
                  </div>
                  
                  {/* Friends Going Badge */}
                  {suggestion.friends_going_count > 0 && (
                    <div className="flex items-center gap-1 mb-1">
                      <AvatarStack
                        urls={suggestion.friends_going_avatars || []}
                        names={suggestion.friends_going_names || []}
                        size={16}
                        max={3}
                        className="pr-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        {suggestion.friends_going_count === 1 ? '1 friend going' : `${suggestion.friends_going_count} friends going`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getDistanceText(suggestion.distance_m)}</span>
                    <span>•</span>
                    <span>{suggestion.participant_count} joined</span>
                  </div>
                </div>
                <Search className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
              </div>
            ))}
          </div>
          
          {/* Footer hint */}
          <div className="px-3 py-2 bg-muted/30 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              ↑↓ to navigate · Enter to select · Esc to close
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}