import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useFloqJoin } from './useFloqJoin';
import { supabase } from '@/integrations/supabase/client';

interface RecommendationAction {
  id: string;
  action: string;
  timestamp: Date;
}

export const useRecommendationActions = () => {
  const [actions, setActions] = useState<RecommendationAction[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [watchList, setWatchList] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { join } = useFloqJoin();

  const handleAction = async (action: string, itemId: string, itemData?: any) => {
    const timestamp = new Date();
    setActions(prev => [...prev, { id: itemId, action, timestamp }]);

    try {
      switch (action) {
        case 'visit':
          if (itemData?.type === 'venue') {
            navigate(`/venues/${itemId}`);
            toast.success(`Visiting ${itemData.title}`);
          } else if (itemData?.type === 'floq') {
            navigate(`/floqs/${itemId}`);
            toast.success(`Opening ${itemData.title}`);
          }
          break;

        case 'join':
          if (itemData?.type === 'floq') {
            await join({ floqId: itemId });
            toast.success(`Joined ${itemData.title}!`);
          } else {
            // For venues, navigate to venue details
            navigate(`/venues/${itemId}`);
            toast.success(`Visiting ${itemData.title}`);
          }
          break;

        case 'request':
          // Request to join private floq
          if (itemData?.type === 'floq') {
            try {
              const { error } = await supabase.rpc('request_floq_access', {
                p_floq_id: itemId
              });
              
              if (error) throw error;
              toast.success(`Request sent to join ${itemData.title}`);
            } catch (error) {
              console.error('Request failed:', error);
              toast.error('Failed to send request. Please try again.');
            }
          }
          break;

        case 'rsvp':
          if (itemData?.type === 'floq') {
            await join({ floqId: itemId });
            toast.success(`RSVP'd to ${itemData.title}!`);
          }
          break;

        case 'favorite':
          setFavorites(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
              newSet.delete(itemId);
              toast.success(`Removed ${itemData?.title} from favorites`);
            } else {
              newSet.add(itemId);
              toast.success(`Added ${itemData?.title} to favorites`);
            }
            return newSet;
          });
          break;

        case 'watch':
          setWatchList(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
              newSet.delete(itemId);
              toast.success(`Removed ${itemData?.title} from watch list`);
            } else {
              newSet.add(itemId);
              toast.success(`Added ${itemData?.title} to watch list`);
            }
            return newSet;
          });
          break;

        case 'share':
          if (navigator.share) {
            await navigator.share({
              title: itemData?.title || 'Check this out',
              text: `Check out this ${itemData?.type || 'item'}: ${itemData?.title}`,
              url: `${window.location.origin}/${itemData?.type}s/${itemId}`
            });
          } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(
              `${window.location.origin}/${itemData?.type}s/${itemId}`
            );
            toast.success('Link copied to clipboard!');
          }
          break;

        default:
          console.warn(`Unknown action: ${action}`);
          toast.error('Action not implemented yet');
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error('Action failed. Please try again.');
    }
  };

  const isFavorite = (itemId: string) => favorites.has(itemId);
  const isWatching = (itemId: string) => watchList.has(itemId);
  
  const getActionHistory = (itemId?: string) => {
    if (itemId) {
      return actions.filter(action => action.id === itemId);
    }
    return actions;
  };
  
  const clearActionHistory = () => {
    setActions([]);
  };

  return {
    handleAction,
    isFavorite,
    isWatching,
    getActionHistory,
    clearActionHistory,
    favorites: Array.from(favorites),
    watchList: Array.from(watchList)
  };
}; 