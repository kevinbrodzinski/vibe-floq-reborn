import { memo } from 'react';
import { Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface TitleRowProps {
  id: string;
  label: string;
  sublabel: string;
  kind: 'floq' | 'event';
  starts_at?: string;
  onTap: (id: string) => void;
}

const getKindIcon = (kind: string) => {
  switch (kind) {
    case 'floq':
      return <Users className="h-4 w-4" />;
    case 'event':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Users className="h-4 w-4" />;
  }
};

const getKindColor = (kind: string) => {
  switch (kind) {
    case 'floq':
      return 'bg-blue-500/10 text-blue-400';
    case 'event':
      return 'bg-purple-500/10 text-purple-400';
    default:
      return 'bg-primary/10 text-primary';
  }
};

const formatStartTime = (starts_at?: string) => {
  if (!starts_at) return '';
  try {
    return formatDistanceToNow(new Date(starts_at), { addSuffix: true });
  } catch {
    return '';
  }
};

export const TitleRow = memo(({ id, label, sublabel, kind, starts_at, onTap }: TitleRowProps) => {
  const startTimeText = formatStartTime(starts_at);

  return (
    <div
      className="flex items-center gap-3 p-3 hover:bg-muted/50 active:bg-muted cursor-pointer border-b border-border/40 last:border-0"
      onClick={() => onTap(id)}
    >
      {/* Kind Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getKindColor(kind)}`}>
        {getKindIcon(kind)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground truncate">
            {label}
          </span>
          <Badge variant="secondary" className="text-xs capitalize">
            {kind}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="truncate">{sublabel}</span>
          {startTimeText && (
            <>
              <span>•</span>
              <span className="text-xs">{startTimeText}</span>
            </>
          )}
        </div>
      </div>

      {/* Chevron indicator */}
      <div className="flex-shrink-0 text-muted-foreground">
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path 
              d="M4.5 3L7.5 6L4.5 9" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
});