import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePing } from '@/hooks/usePing';
import { cn } from '@/lib/utils';

interface QuickPingButtonProps {
  targetId: string;
  className?: string;
}

export const QuickPingButton = ({ targetId, className }: QuickPingButtonProps) => {
  const ping = usePing();

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => ping(targetId)}
      className={cn(
        'absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0',
        'bg-purple-600/20 border-purple-400/30 text-purple-300',
        'hover:bg-purple-500/30 hover:border-purple-300/50',
        'shadow-lg backdrop-blur-sm',
        className
      )}
    >
      <Zap className="h-4 w-4" />
    </Button>
  );
};