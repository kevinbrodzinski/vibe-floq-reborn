
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, MapPin, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

interface SearchResult {
  id: string;
  type: 'venue' | 'event' | 'person' | 'location';
  title: string;
  subtitle?: string;
  distance?: string;
  metadata?: {
    attendees?: number;
    time?: string;
    status?: string;
  };
}

interface SearchBarWithTypeaheadProps {
  value?: string;
  onChange?: (query: string) => void;
  onSelect?: (result: SearchResult) => void;
  onSearch?: (query: string) => void;
  onResultSelect?: (result: SearchResult) => void;
  results?: SearchResult[];
  placeholder?: string;
  className?: string;
  showRecent?: boolean;
  recentSearches?: string[];
  isLoading?: boolean;
}

const RESULT_ICONS = {
  venue: MapPin,
  event: Clock,
  person: Users,
  location: MapPin,
} as const;

export const SearchBarWithTypeahead: React.FC<SearchBarWithTypeaheadProps> = ({
  value: controlledValue,
  onChange,
  onSelect,
  onSearch = () => {},
  onResultSelect = () => {},
  results = [],
  placeholder = "Search venues, events, people...",
  className = "",
  showRecent = true,
  recentSearches = [],
  isLoading = false
}) => {
  const [query, setQuery] = useState(controlledValue || '');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setQuery(controlledValue);
    }
  }, [controlledValue]);

  const displayResults = useMemo(() => {
    return query.length > 0 ? results : 
      (showRecent && recentSearches.length > 0 ? 
        recentSearches.map(search => ({
          id: search,
          type: 'location' as const,
          title: search,
          subtitle: 'Recent search'
        })) : []);
  }, [query, results, showRecent, recentSearches]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < displayResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && displayResults[focusedIndex]) {
          onResultSelect(displayResults[focusedIndex]);
          setIsOpen(false);
          setQuery('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    onChange?.(value);
    onSearch(value);
    setIsOpen(value.length > 0 || (showRecent && recentSearches.length > 0));
    setFocusedIndex(-1);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result);
    onSelect?.(result);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={resultsRef} className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(query.length > 0 || (showRecent && recentSearches.length > 0))}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            {...zIndex('modal')}
            className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto"
          >
            <Card className="shadow-lg border border-border/50">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                    Searching...
                  </div>
                ) : displayResults.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {query.length > 0 ? 'No results found' : 'Start typing to search'}
                  </div>
                ) : (
                  <div>
                    {query.length === 0 && showRecent && recentSearches.length > 0 && (
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                        Recent searches
                      </div>
                    )}
                    {displayResults.map((result, index) => {
                      const IconComponent = RESULT_ICONS[result.type];
                      const isFocused = index === focusedIndex;

                      return (
                        <motion.div
                          key={result.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors
                                     ${isFocused ? 'bg-accent' : 'hover:bg-accent/50'}`}
                          onClick={() => handleResultClick(result)}
                          whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                        >
                          <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {result.distance && (
                              <Badge variant="secondary" className="text-xs">
                                {result.distance}
                              </Badge>
                            )}
                            {result.metadata?.attendees && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {result.metadata.attendees}
                              </Badge>
                            )}
                            {result.metadata?.time && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {result.metadata.time}
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
