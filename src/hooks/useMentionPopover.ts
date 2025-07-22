import { useState } from 'react';

export interface MentionTarget {
  tag: string;              // the "@username" / "@venue-slug"
  x:   number;
  y:   number;
}

export const useMentionPopover = () => {
  const [target, setTarget] = useState<MentionTarget | null>(null);

  return {
    target,
    open: (t: MentionTarget) => setTarget(t),
    close: () => setTarget(null),
  };
};