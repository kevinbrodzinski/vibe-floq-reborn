import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ReplySnippetProps {
  messageId: string;
  className?: string;
}

export const ReplySnippet = ({ messageId, className }: ReplySnippetProps) => {
  const { data: message, isLoading } = useQuery({
    queryKey: ['dm-message', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('id, content, profile_id, metadata')
        .eq('id', messageId)
        .maybeSingle();
      
      if (error) throw error;
      return data ?? null; // graceful fallback
    },
    staleTime: 60_000, // Cache for 1 minute since replies don't change often
  });

  if (isLoading) {
    return <Skeleton className="h-8 w-full mb-1" />;
  }

  if (!message) {
    return (
      <div 
        className={cn("text-xs text-muted-foreground italic mb-1", className)}
        aria-label="Deleted message"
      >
        [Deleted message]
      </div>
    );
  }

  const getMessagePreview = () => {
    try {
      const metadata = typeof message.metadata === 'string' 
        ? JSON.parse(message.metadata) 
        : message.metadata;
      
      if (metadata?.media) {
        return '📷 Media';
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    return message.content || '[No content]';
  };

  return (
    <div className={cn(
      "text-xs bg-muted/50 p-2 rounded mb-1 border-l-2 border-primary/50 w-full",
      className
    )}>
      <div className="font-medium text-muted-foreground mb-1">Replying to:</div>
      <div className="line-clamp-1 break-words overflow-hidden">{getMessagePreview()}</div>
    </div>
  );
};