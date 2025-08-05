import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

const RECENT_SEARCHES_KEY = 'floq_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export interface RecentSearch {
  query: string;
  timestamp: number;
}

export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches from storage on mount
  useEffect(() => {
    const loadSearches = async () => {
      try {
        const searches = await storage.getJSON<RecentSearch[]>(RECENT_SEARCHES_KEY);
        if (searches) {
          // Filter out old searches (older than 7 days)
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const valid = searches.filter(search => search.timestamp > weekAgo);
          setRecentSearches(valid.slice(0, MAX_RECENT_SEARCHES));
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load recent searches:', error);
        }
      }
    };
    loadSearches();
  }, []);

  const addRecentSearch = (query: string) => {
    if (!query.trim() || query.length < 2) return;

    const newSearch: RecentSearch = {
      query: query.trim(),
      timestamp: Date.now()
    };

    setRecentSearches(prev => {
      // Remove duplicates and add new search at the beginning
      const filtered = prev.filter(search => 
        search.query.toLowerCase() !== query.toLowerCase()
      );
      const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      // Save to storage async
      storage.setJSON(RECENT_SEARCHES_KEY, updated).catch(error => {
        if (import.meta.env.DEV) {
          console.error('Failed to save recent searches:', error);
        }
      });
      
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    storage.removeItem(RECENT_SEARCHES_KEY).catch(error => {
      if (import.meta.env.DEV) {
        console.error('Failed to clear recent searches:', error);
      }
    });
  };

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches
  };
};