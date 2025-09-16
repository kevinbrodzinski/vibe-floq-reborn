import { useCallback, useEffect } from 'react';
import { openFloqPeek } from '@/lib/peek';

interface UseFloqNavigationOptions {
  floqs: Array<{ id: string; name?: string; title?: string }>;
  onNavigate?: (floqId: string) => void;
}

export function useFloqNavigation({ floqs, onNavigate }: UseFloqNavigationOptions) {
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Global shortcuts for floq navigation
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'k':
          e.preventDefault();
          // Open quick floq picker (could be a command palette)
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          e.preventDefault();
          const index = parseInt(e.key) - 1;
          if (floqs[index]) {
            openFloqPeek(floqs[index].id, 'watch');
            onNavigate?.(floqs[index].id);
          }
          break;
      }
    }
    
    // Quick peek shortcuts
    if (e.key === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // 'p' for peek - could open the last viewed floq
      if (floqs[0]) {
        openFloqPeek(floqs[0].id, 'consider');
        onNavigate?.(floqs[0].id);
      }
    }
  }, [floqs, onNavigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return {
    // Programmatic navigation helpers
    peekFloq: (floqId: string, stage: 'watch' | 'consider' | 'commit' = 'watch') => {
      openFloqPeek(floqId, stage);
      onNavigate?.(floqId);
    }
  };
}