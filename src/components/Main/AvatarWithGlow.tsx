import React from 'react';
import { AvatarDropdown } from '@/components/AvatarDropdown';

export function AvatarWithGlow({ color }: { color?: string }) {
  return (
    <div className="relative">
      {/* glow ring */}
      <div
        aria-hidden
        className="absolute -inset-1 rounded-full blur-md"
        style={{
          background: color || 'hsl(var(--primary))',
          opacity: 0.6,
        }}
      />
      <div className="relative">
        <AvatarDropdown />
      </div>
    </div>
  );
}