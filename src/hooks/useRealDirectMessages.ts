import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  metadata?: any;
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

export function useDirectThreads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

      return data as DirectThread[];
    },
  });

  return {
    threads,
    isLoading,
  };
}

export function useDirectMessages(threadId?: string) {
  const { user } = useAuth();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['direct-messages', threadId],
    enabled: !!threadId && !!user?.id,
    queryFn: async () => {
      if (!threadId) return [];

      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching direct messages:', error);
        throw error;
      }

      return data as DirectMessage[];
    },
  });

  return {
    messages,
    isLoading,
  };
}

export function useSendDirectMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendMessage = useMutation({
    mutationFn: async ({ 
      recipientId, 
      content 
    }: { 
      recipientId: string; 
      content: string; 
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // First, find or create the thread
      let threadId: string;

      // Look for existing thread
      const { data: existingThreads, error: findError } = await supabase
        .from('direct_threads')
        .select('id')
        .or(`and(member_a.eq.${user.id},member_b.eq.${recipientId}),and(member_a.eq.${recipientId},member_b.eq.${user.id})`)
        .maybeSingle();

      if (findError) throw findError;

      if (existingThreads) {
        threadId = existingThreads.id;
      } else {
        // Create new thread
        const { data: newThread, error: createError } = await supabase
          .from('direct_threads')
          .insert({
            member_a: user.id,
            member_b: recipientId,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        threadId = newThread.id;
      }

      // Send the message
      const { error: messageError } = await supabase
        .from('direct_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content,
        });

      if (messageError) throw messageError;

      return threadId;
    },
    onSuccess: (threadId) => {
      queryClient.invalidateQueries({ queryKey: ['direct-threads'] });
      queryClient.invalidateQueries({ queryKey: ['direct-messages', threadId] });
      toast({
        title: "Message sent",
      });
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

export function useCreateDirectThread() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createThread = useMutation({
    mutationFn: async (recipientId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if thread already exists
      const { data: existingThread } = await supabase
        .from('direct_threads')
        .select('id')
        .or(`and(member_a.eq.${user.id},member_b.eq.${recipientId}),and(member_a.eq.${recipientId},member_b.eq.${user.id})`)
        .maybeSingle();

      if (existingThread) {
        return existingThread.id;
      }

      // Create new thread
      const { data, error } = await supabase
        .from('direct_threads')
        .insert({
          member_a: user.id,
          member_b: recipientId,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-threads'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create conversation",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createThread: createThread.mutate,
    isCreating: createThread.isPending,
  };
}