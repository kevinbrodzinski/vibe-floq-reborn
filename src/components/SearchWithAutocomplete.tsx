import { useState, useRef, useEffect } from 'react';
import { Search, X, History, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { UserSearchResults } from '@/components/UserSearchResults';
import { SearchResultSkeleton } from '@/components/skeletons';

interface SearchWithAutocompleteProps {
  onAddFriend: (userId: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchWithAutocomplete = ({ 
  onAddFriend, 
  placeholder = "Search users...",
  className 
}: SearchWithAutocompleteProps) => {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading } = useUserSearch(query, showDropdown);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  const hasResults = searchResults && searchResults.length > 0;
  const showRecentSearches = showDropdown && !query.trim() && recentSearches.length > 0;
  const showSearchResults = showDropdown && query.trim().length >= 2 && (hasResults || isLoading);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    setShowDropdown(true);
  };

  const handleSearchSubmit = () => {
    if (query.trim()) {
      addRecentSearch(query.trim());
      setShowDropdown(false);
      // Focus back to input for next search
      inputRef.current?.focus();
    }
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    setShowDropdown(false);
    addRecentSearch(recentQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    const totalItems = showRecentSearches ? recentSearches.length : (searchResults?.length || 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (showRecentSearches && selectedIndex >= 0) {
          const selected = recentSearches[selectedIndex];
          if (selected) {
            handleRecentSearchClick(selected.query);
          }
        } else if (selectedIndex >= 0 && searchResults?.[selectedIndex]) {
          onAddFriend(searchResults[selectedIndex].id);
          setShowDropdown(false);
        } else {
          handleSearchSubmit();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (showRecentSearches || showSearchResults) && (
        <div
          ref={dropdownRef}
          className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-lg"
        >
          {/* Recent Searches */}
          {showRecentSearches && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium text-muted-foreground">Recent searches</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="h-auto p-1 text-xs"
                >
                  Clear
                </Button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search.timestamp}
                  onClick={() => handleRecentSearchClick(search.query)}
                  className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent ${
                    selectedIndex === index ? 'bg-accent' : ''
                  }`}
                >
                  <History className="h-3 w-3 text-muted-foreground" />
                  <span>{search.query}</span>
                  <ArrowUp className="ml-auto h-3 w-3 rotate-45 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {showSearchResults && (
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-2">
                  <SearchResultSkeleton count={3} />
                </div>
              ) : hasResults ? (
                <UserSearchResults
                  users={searchResults}
                  onAddFriend={(userId) => {
                    onAddFriend(userId);
                    setShowDropdown(false);
                    addRecentSearch(query.trim());
                  }}
                  selectedIndex={showRecentSearches ? -1 : selectedIndex}
                />
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found for "{query}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};