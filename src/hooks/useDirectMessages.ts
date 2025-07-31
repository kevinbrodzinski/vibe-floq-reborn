import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { uploadDmMedia } from '@/utils/uploadDmMedia';

export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  reply_to_id?: string | null;
  image_url?: string | null;
  emoji_only?: boolean;
  metadata?: any;
  profiles?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface DirectThread {
  id: string;
  member_a: string;
  member_b: string;
  created_at: string;
  last_message_at: string;
  last_read_at_a: string;
  last_read_at_b: string;
  unread_a: number;
  unread_b: number;
}

export function useDirectMessages(threadId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    if (!threadId) return;
    
    const channel = supabase
      .channel(`dms:${threadId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'direct_messages', 
        filter: `thread_id=eq.${threadId}` 
      }, () => queryClient.invalidateQueries({ queryKey: ['dm-messages', threadId] }))
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['dm-messages', threadId],
    enabled: !!threadId && !!user?.id,
    queryFn: async () => {
      if (!threadId) return [];

      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          profiles!direct_messages_sender_id_fkey(display_name, username, avatar_url)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching direct messages:', error);
        throw error;
      }

      return (data || []) as unknown as DirectMessage[];
    },
  });

  return {
    messages,
    isLoading,
  };
}

export function useDirectThreads() {
  const { user } = useAuth();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['direct-threads', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('direct_threads')
        .select('*')
        .or(`member_a.eq.${user.id},member_b.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching direct threads:', error);
        throw error;
      }

      return (data || []) as DirectThread[];
    },
  });

  return {
    threads,
    isLoading,
  };
}

export async function sendDm({
  threadId,
  content,
  replyToId,
  file,
  emojiOnly,
}: {
  threadId: string;
  content?: string;
  replyToId?: string;
  file?: File;
  emojiOnly?: boolean;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  let imageUrl: string | null = null;
  if (file) {
    imageUrl = await uploadDmMedia(file);
  }

  const { error } = await supabase.from('direct_messages').insert({
    thread_id: threadId,
    sender_id: user.user.id,
    profile_id: user.user.id,  // Required field
    content: content ?? null,
    metadata: {
      image_url: imageUrl,
      emoji_only: emojiOnly ?? false,
      reply_to_id: replyToId ?? null,
    }
  });
  
  if (error) throw error;
}

export async function reactToDm(messageId: string, emoji: string) {
  // This would need a dm_add_reaction RPC function in the database
  // For now, just log since the RPC doesn't exist yet
  console.log('DM reaction:', messageId, emoji);
  // TODO: Implement when dm_add_reaction RPC is available
}

export function useSendDirectMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendMessage = useMutation({
    mutationFn: sendDm,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dm-messages', variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['direct-threads'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
  };
}