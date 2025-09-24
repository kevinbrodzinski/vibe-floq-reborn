import * as React from "react";
import { AvatarStack, AvatarItem } from "./AvatarStack";

type Props = {
  items: AvatarItem[];
  revealCount: number;
  max?: number;
  size?: number;
  overlap?: number;
  ring?: number;
  className?: string;
  onAvatarPress?: (item: AvatarItem, e: React.MouseEvent | React.KeyboardEvent) => void;
};

export function PartialRevealAvatarStack({
  items,
  revealCount,
  max = 4,
  size = 24,
  overlap = 8,
  ring = 2,
  className = "",
  onAvatarPress,
}: Props) {
  const revealed = items.slice(0, revealCount);
  const hidden = items.slice(revealCount, max);
  
  // Create placeholder items for hidden avatars
  const placeholders = hidden.map((item, idx) => ({
    ...item,
    name: null, // Hide names for mystery
    imageUrl: null, // Show initials only
  }));

  const displayItems = [...revealed, ...placeholders];

  return (
    <div className={`transition-opacity ${revealCount === 0 ? 'opacity-60' : 'opacity-100'} ${className}`}>
      <AvatarStack
        items={displayItems}
        max={max}
        size={size}
        overlap={overlap}
        ring={ring}
        onAvatarPress={revealCount > 0 ? onAvatarPress : undefined}
      />
    </div>
  );
}