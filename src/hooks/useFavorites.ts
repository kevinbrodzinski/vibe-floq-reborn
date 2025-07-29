import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export interface FavoriteItem {
  id: string;
  user_id: string;
  item_id: string;
  item_type: 'venue' | 'plan';
  created_at: string;
  title?: string;
  description?: string;
  image_url?: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async (): Promise<FavoriteItem[]> => {
      if (!user?.id) return [];

      // TODO: Enable when user_favorites table is created
      // For now, return empty array to prevent build errors
      return [];

      // const { data, error } = await supabase
      //   .from('user_favorites')
      //   .select(`
      //     id,
      //     user_id,
      //     item_id,
      //     item_type,
      //     created_at,
      //     title,
      //     description,
      //     image_url
      //   `)
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false });

      // if (error) throw error;
      // return data || [];
    },
    enabled: !!user?.id,
  });

  const addFavorite = useMutation({
    mutationFn: async ({ itemId, itemType, title, description, imageUrl }: {
      itemId: string;
      itemType: 'venue' | 'plan';
      title?: string;
      description?: string;
      imageUrl?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // TODO: Enable when user_favorites table is created
      return { id: 'placeholder', profile_id: user.id, item_id: itemId, item_type: itemType };

      // const { data, error } = await supabase
      //   .from('user_favorites')
      //   .insert({
      //     user_id: user.id,
      //     item_id: itemId,
      //     item_type: itemType,
      //     title,
      //     description,
      //     image_url: imageUrl,
      //   })
      //   .select()
      //   .single();

      // if (error) throw error;
      // return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      toast.success('Added to favorites!');
    },
    onError: (error) => {
      console.error('Failed to add favorite:', error);
      toast.error('Failed to add to favorites');
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // TODO: Enable when user_favorites table is created
      return;

      // const { error } = await supabase
      //   .from('user_favorites')
      //   .delete()
      //   .eq('user_id', user.id)
      //   .eq('item_id', itemId);

      // if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      toast.success('Removed from favorites');
    },
    onError: (error) => {
      console.error('Failed to remove favorite:', error);
      toast.error('Failed to remove from favorites');
    },
  });

  const isFavorite = (itemId: string) => {
    return favorites.some(fav => fav.item_id === itemId);
  };

  return {
    favorites,
    isLoading,
    error,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    isFavorite,
    isAdding: addFavorite.isPending,
    isRemoving: removeFavorite.isPending,
  };
}; 