import dayjs from '@/lib/dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Badge } from '@/components/ui/badge';
dayjs.extend(relativeTime);

type Props =
  | { kind: 'arrived' }
  | { kind: 'enroute' }
  | { kind: 'lastSeen'; ts: string };

export function PresenceBadge(p: Props) {
  if (p.kind === 'arrived') {
    return <Badge variant="default" className="bg-green-500 text-white border-green-500">Arrived</Badge>;
  }
  if (p.kind === 'enroute') {
    return <Badge>En-route</Badge>;
  }

  // last-seen
  return (
    <span className="text-xs text-muted-foreground">
      {dayjs(p.ts).fromNow(true)}
    </span>
  );
}