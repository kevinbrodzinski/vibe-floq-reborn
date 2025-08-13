import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Edit3, ChevronDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCitySearch, getPopularCities, type CityLocation } from '@/hooks/useLocationSearch';

interface LocationWeatherBarProps {
  // Location props
  currentLocation?: string;
  onLocationChange?: (location: CityLocation) => void;
  
  // Weather props  
  weather?: {
    tempF: number;
    condition: string;
    precipChancePct: number;
  };
  
  className?: string;
}

export const LocationWeatherBar: React.FC<LocationWeatherBarProps> = ({
  currentLocation = "Current Location",
  onLocationChange,
  weather,
  className
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { results: searchResults, isSearching } = useCitySearch(searchQuery);
  const popularCities = getPopularCities();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSelect = (city: CityLocation) => {
    if (onLocationChange) {
      onLocationChange(city);
    }
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
    setSearchQuery('');
  };

  const formatWeatherCompact = () => {
    if (!weather) return null;
    const { tempF, condition, precipChancePct } = weather;
    return `${Math.round(tempF)}° ${condition} ${Math.round(precipChancePct)}%`;
  };

  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-2 mb-4',
      className
    )}>
      {/* Location Section - Left */}
      <div className="relative flex items-center gap-2 flex-1 min-w-0" ref={dropdownRef}>
        <MapPin className="w-4 h-4 text-white/60 flex-shrink-0" />
        
        {/* Location Display & Dropdown Trigger */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-white/80 text-sm truncate">
            {currentLocation}
          </span>
          {onLocationChange && (
            <button
              onClick={handleDropdownToggle}
              className="p-1 text-white/50 hover:text-white/70 transition-colors flex-shrink-0"
              title="Change location"
            >
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform duration-200",
                isDropdownOpen && "rotate-180"
              )} />
            </button>
          )}
        </div>

        {/* Searchable Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-50 max-h-80 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cities..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 text-white text-sm rounded-lg border border-white/20 focus:border-white/40 focus:outline-none placeholder-white/40"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto">
              {searchQuery.length >= 2 ? (
                /* Search Results */
                searchResults.length > 0 ? (
                  <div className="p-2">
                    <div className="text-xs text-white/50 px-2 py-1 mb-1">Search Results</div>
                    {searchResults.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleLocationSelect(city)}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-white/50 text-sm">
                    No cities found
                  </div>
                )
              ) : (
                /* Popular Cities */
                <div className="p-2">
                  <div className="text-xs text-white/50 px-2 py-1 mb-1">Popular Cities</div>
                  {popularCities.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => handleLocationSelect(city)}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weather Section - Right */}
      {weather && (
        <div className="flex items-center gap-1 text-sm text-white/70 flex-shrink-0">
          <span>{formatWeatherCompact()}</span>
        </div>
      )}
    </div>
  );
};