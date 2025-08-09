import { cn } from '@/lib/utils';

type Message = {
  id: string;
  thread_id: string;
  content?: string | null;
  created_at: string;
  profile_id?: string;
  sender_id?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reply_to?: string | null;
  reply_to_msg?: {
    id: string | null;
    profile_id: string | null;
    content: string | null;
    created_at: string | null;
  } | null;
  reactions?: Array<{ emoji: string; count: number; reactors: string[] }>;
};

export function MessageBubble({
  message,
  isOwn,
  isConsecutive,
  senderProfile,
}: {
  message: Message;
  isOwn: boolean;
  isConsecutive: boolean;
  senderProfile?: any;
}) {
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {message.content ?? ''}
    </div>
  );
}