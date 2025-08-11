import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { uploadAvatar, deleteAvatar } from '@/lib/avatar';
import { clearAvatarUrlCache } from '@/hooks/useAvatarUrl';
import { useQueryClient } from '@tanstack/react-query';

export function useAvatarManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (file: File) => {
    setIsSaving(true);
    try {
      if (!user) throw new Error('No user found');
      
      // Get current avatar for cleanup
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      const { path, error: uploadError } = await uploadAvatar(file);
      if (uploadError) throw new Error(uploadError);
      
      // Update profile with public URL (path now contains the public URL)
      await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', user.id);

      // Clean up old avatar if it exists
      if (currentProfile?.avatar_url && currentProfile.avatar_url !== path) {
        // Don't await this - let it run in background
        deleteAvatar(currentProfile.avatar_url).catch(console.warn);
        clearAvatarUrlCache(currentProfile.avatar_url);
      }
      
      // Clear cache for new avatar
      if (path) {
        clearAvatarUrlCache(path);
      }

      toast({ title: 'Avatar updated' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      if (!user) throw new Error('No user found');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();;
      
      if (profile?.avatar_url) {
        await deleteAvatar(profile.avatar_url);
        // Clear cache for deleted avatar
        clearAvatarUrlCache(profile.avatar_url);
      }
      
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
        
      toast({ title: 'Avatar removed' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Remove failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return { open, setOpen, handleSave, handleDelete, isSaving };
}