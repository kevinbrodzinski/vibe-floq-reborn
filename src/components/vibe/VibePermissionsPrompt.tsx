import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useVibeNow } from '@/hooks/useVibeNow';
import { cn } from '@/lib/utils';

export function VibePermissionsPrompt() {
  const { requestEnv } = useVibeNow(); // uses same hook instance up the tree

  const onAllow = async () => {
    try {
      const ok = await requestEnv();
      // you could toast here if you use a toast system
      // toast({ title: ok ? 'Environmental signals enabled' : 'No permission granted' })
    } catch (error) {
      console.warn('Environmental permissions failed:', error);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card/60 p-3 flex items-center gap-3">
      <div className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
        Env
      </div>
      <div className="text-sm text-muted-foreground flex-1">
        Improve vibe accuracy using ambient context (no recordings, privacy-first).
      </div>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onAllow}
        className="shrink-0"
      >
        🔊 Enable
      </Button>
    </div>
  );
}