import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FavoriteItem {
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

      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          item_id,
          item_type,
          created_at,
          title,
          description,
          image_url
        `)
        .eq('profile_id', user.id as any)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = Array.isArray(data) ? (data as any[]) : [];
      return rows.map((item: any) => ({
        user_id: user.id,
        item_id: item.item_id,
        item_type: item.item_type as 'venue' | 'plan',
        created_at: item.created_at,
        title: item.title,
        description: item.description,
        image_url: item.image_url,
      }));
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

      const { data, error } = await supabase
        .from('user_favorites' as any)
        .insert({
          profile_id: user.id,
          item_id: itemId,
          item_type: itemType,
          title,
          description,
          image_url: imageUrl,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return {
        user_id: user.id,
        item_id: data.item_id,
        item_type: data.item_type as 'venue' | 'plan',
        created_at: data.created_at,
        title: data.title,
        description: data.description,
        image_url: data.image_url,
      };
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

      const { error } = await supabase
        .from('user_favorites' as any)
        .delete()
        .eq('profile_id', user.id as any)
        .eq('item_id', itemId as any);

      if (error) throw error;
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

  const toggleFavorite = useMutation({
    mutationFn: async (params: {
      itemId: string;
      itemType: 'venue' | 'plan';
      title?: string;
      description?: string;
      imageUrl?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      if (isFavorite(params.itemId)) {
        await removeFavorite.mutateAsync(params.itemId);
      } else {
        await addFavorite.mutateAsync(params);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
    onError: (error) => {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update favorites');
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
    toggleFavorite: toggleFavorite.mutate,
    isFavorite,
    isAdding: addFavorite.isPending,
    isRemoving: removeFavorite.isPending,
    isToggling: toggleFavorite.isPending,
  };
}; 