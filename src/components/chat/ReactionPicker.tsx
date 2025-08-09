import * as React from 'react';

type Props = {
  onPick: (emoji: string) => void;
  size?: 'sm' | 'md';
};

const EMOJIS = ['👍','❤️','😂','😮','😢','👎'];

export function ReactionPicker({ onPick, size = 'sm' }: Props) {
  return (
    <div className="flex gap-1">
      {EMOJIS.map(e => (
        <button
          key={e}
          className="text-base leading-none hover:scale-110 transition-transform p-1 rounded hover:bg-muted/50"
          onClick={() => onPick(e)}
        >
          {e}
        </button>
      ))}
    </div>
  );
}