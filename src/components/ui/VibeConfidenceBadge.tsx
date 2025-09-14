import * as React from 'react';

export function VibeConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.5) return null;
  return (
    <span
      className="ml-2 inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 text-[11px] font-medium text-yellow-300"
      title="The system is still learning—confidence is low right now"
    >
      learning
    </span>
  );
}