import React from 'react';
import { Sparkles, Sun, Cloud, Clock, MapPin } from 'lucide-react';
import { PulseFilterContext } from '@/hooks/usePulseFilters';

interface ContextualFilterSuggestionsProps {
  context: PulseFilterContext;
  onFilterSelect: (filterKey: string) => void;
  selectedFilters: string[];
  className?: string;
}

interface FilterSuggestion {
  key: string;
  label: string;
  reason: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
}

export const ContextualFilterSuggestions: React.FC<ContextualFilterSuggestionsProps> = ({
  context,
  onFilterSelect,
  selectedFilters,
  className = ''
}) => {
  const suggestions = React.useMemo(() => {
    const suggestions: FilterSuggestion[] = [];
    
    // Time-based suggestions
    if (context.timeOfDay === 'morning') {
      if (!selectedFilters.includes('coffee_spots')) {
        suggestions.push({
          key: 'coffee_spots',
          label: 'Coffee Spots',
          reason: 'Perfect for your morning routine',
          icon: <Clock className="w-3 h-3" />,
          priority: 'high'
        });
      }
      if (!selectedFilters.includes('breakfast')) {
        suggestions.push({
          key: 'breakfast',
          label: 'Breakfast',
          reason: 'Start your day right',
          icon: <Clock className="w-3 h-3" />,
          priority: 'high'
        });
      }
    } else if (context.timeOfDay === 'evening') {
      if (!selectedFilters.includes('dinner_spots')) {
        suggestions.push({
          key: 'dinner_spots',
          label: 'Dinner Spots',
          reason: 'Evening dining options',
          icon: <Clock className="w-3 h-3" />,
          priority: 'high'
        });
      }
      if (!selectedFilters.includes('live_music')) {
        suggestions.push({
          key: 'live_music',
          label: 'Live Music',
          reason: 'Great evening entertainment',
          icon: <Clock className="w-3 h-3" />,
          priority: 'medium'
        });
      }
    } else if (context.timeOfDay === 'lateNight') {
      if (!selectedFilters.includes('bars_clubs')) {
        suggestions.push({
          key: 'bars_clubs',
          label: 'Bars & Clubs',
          reason: 'Late night vibes',
          icon: <Clock className="w-3 h-3" />,
          priority: 'high'
        });
      }
    }
    
    // Weather-based suggestions
    if (context.weather === 'good') {
      if (!selectedFilters.includes('outdoor_dining')) {
        suggestions.push({
          key: 'outdoor_dining',
          label: 'Outdoor Dining',
          reason: `Great weather (${context.temperature}°F)`,
          icon: <Sun className="w-3 h-3" />,
          priority: 'high'
        });
      }
      if (!selectedFilters.includes('rooftop_bars')) {
        suggestions.push({
          key: 'rooftop_bars',
          label: 'Rooftop Bars',
          reason: 'Perfect for outdoor drinks',
          icon: <Sun className="w-3 h-3" />,
          priority: 'medium'
        });
      }
    } else if (context.weather === 'bad') {
      if (!selectedFilters.includes('cozy_lounges')) {
        suggestions.push({
          key: 'cozy_lounges',
          label: 'Cozy Lounges',
          reason: `Stay dry (${context.precipitationChance}% rain)`,
          icon: <Cloud className="w-3 h-3" />,
          priority: 'high'
        });
      }
      if (!selectedFilters.includes('indoor_entertainment')) {
        suggestions.push({
          key: 'indoor_entertainment',
          label: 'Indoor Entertainment',
          reason: 'Weather-proof fun',
          icon: <Cloud className="w-3 h-3" />,
          priority: 'medium'
        });
      }
    }
    
    // Day type suggestions
    if (context.dayType === 'weekend') {
      if (!selectedFilters.includes('brunch')) {
        suggestions.push({
          key: 'brunch',
          label: 'Brunch',
          reason: 'Weekend special',
          icon: <Sparkles className="w-3 h-3" />,
          priority: 'medium'
        });
      }
    }
    
    // Social context suggestions
    if (context.hasFriendsActive && !selectedFilters.includes('trending_venues')) {
      suggestions.push({
        key: 'trending_venues',
        label: 'Trending Venues',
        reason: 'Where your friends are going',
        icon: <MapPin className="w-3 h-3" />,
        priority: 'high'
      });
    }
    
    // Sort by priority and limit to top 3
    return suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 3);
  }, [context, selectedFilters]);
  
  if (suggestions.length === 0) return null;
  
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Suggested for you</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.key}
            onClick={() => onFilterSelect(suggestion.key)}
            className={`
              inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium
              transition-all duration-200 hover:scale-105
              ${suggestion.priority === 'high' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                : 'bg-white/10 text-white/90 border border-white/20 hover:bg-white/15'
              }
            `}
          >
            {suggestion.icon}
            <span>{suggestion.label}</span>
            <span className="text-xs opacity-75">• {suggestion.reason}</span>
          </button>
        ))}
      </div>
    </div>
  );
};