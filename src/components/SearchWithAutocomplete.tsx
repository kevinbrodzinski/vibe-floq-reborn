
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin, Clock, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

interface SearchResult {
  id: string;
  title: string;
  type: 'venue' | 'event' | 'person' | 'location';
  subtitle?: string;
  distance?: string;
  isRecent?: boolean;
}

interface SearchWithAutocompleteProps {
  placeholder?: string;
  results?: SearchResult[];
  recentSearches?: SearchResult[];
  isLoading?: boolean;
  showRecent?: boolean;
  onSearch?: (query: string) => void;
  onSelect?: (result: SearchResult) => void;
  onClear?: () => void;
  className?: string;
}

const RESULT_ICONS = {
  venue: MapPin,
  event: Clock,
  person: Users,
  location: MapPin,
} as const;

export const SearchWithAutocomplete: React.FC<SearchWithAutocompleteProps> = ({
  placeholder = "Search venues, events, people...",
  results = [],
  recentSearches = [],
  isLoading = false,
  showRecent = true,
  onSearch,
  onSelect,
  onClear,
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const displayResults = query.length > 0 ? results : 
    (showRecent && recentSearches.length > 0 ? 
      recentSearches.map(r => ({ ...r, isRecent: true })) : 
      []
    );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || displayResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < displayResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : displayResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSelect(displayResults[focusedIndex]);
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
    onSearch?.(value);
    setIsOpen(value.length > 0 || (showRecent && recentSearches.length > 0));
    setFocusedIndex(-1);
  };

  const handleSelect = (result: SearchResult) => {
    onSelect?.(result);
    setQuery('');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    setFocusedIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(query.length > 0 || (showRecent && recentSearches.length > 0))}
          className="pl-10 pr-10"
        />
        {(query.length > 0 || isLoading) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {query.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 w-6 p-0 hover:bg-transparent"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && displayResults.length > 0 && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            {...zIndex('modal')}
            className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {query.length === 0 && showRecent && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/50">
                Recent searches
              </div>
            )}
            
            <div className="max-h-64 overflow-y-auto">
              {displayResults.map((result, index) => {
                const IconComponent = RESULT_ICONS[result.type];
                const isFocused = index === focusedIndex;
                
                return (
                  <motion.div
                    key={result.id}
                    className={`
                      flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors
                      ${isFocused ? 'bg-accent' : 'hover:bg-accent/50'}
                    `}
                    onClick={() => handleSelect(result)}
                    whileHover={{ backgroundColor: 'var(--accent)' }}
                  >
                    <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {result.title}
                        </p>
                        {result.isRecent && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            Recent
                          </Badge>
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    
                    {result.distance && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {result.distance}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
