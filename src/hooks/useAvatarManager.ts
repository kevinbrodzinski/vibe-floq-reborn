import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { uploadAvatar, deleteAvatar } from '@/lib/avatar';
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
      
      const { path } = await uploadAvatar(file);
      
      await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', user.id);

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
        .single();
      
      if (profile?.avatar_url) {
        await deleteAvatar(profile.avatar_url);
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