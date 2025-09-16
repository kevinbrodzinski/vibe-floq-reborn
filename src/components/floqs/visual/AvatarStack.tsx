import * as React from "react";

export type AvatarItem = {
  id: string;
  name?: string | null;
  imageUrl?: string | null;
};

type Props = {
  items: AvatarItem[];
  /** max avatars to render before showing a +N chip */
  max?: number;
  /** px, applied to h/w; defaults to 24 */
  size?: number;
  /** overlap in px (negative margin); defaults to 8 */
  overlap?: number;
  /** ring width in px; defaults to 2 (uses token ring color) */
  ring?: number;
  className?: string;
};

export function AvatarStack({
  items,
  max = 4,
  size = 24,
  overlap = 8,
  ring = 2,
  className = "",
}: Props) {
  const visible = items.slice(0, Math.max(0, max));
  const overflow = Math.max(0, items.length - visible.length);

  return (
    <div className={`flex items-center ${className}`} aria-label="Friends in this floq">
      {visible.map((p, i) => (
        <AvatarBubble
          key={p.id || `${i}`}
          size={size}
          ring={ring}
          style={{ marginLeft: i === 0 ? 0 : -overlap }}
          name={p.name ?? ""}
          imageUrl={p.imageUrl ?? undefined}
        />
      ))}
      {overflow > 0 && (
        <OverflowChip
          count={overflow}
          size={size}
          ring={ring}
          style={{ marginLeft: visible.length ? -overlap : 0 }}
        />
      )}
    </div>
  );
}

/* — internals — */

function AvatarBubble({
  name,
  imageUrl,
  size,
  ring,
  style,
}: { name: string; imageUrl?: string; size: number; ring: number; style?: React.CSSProperties }) {
  const [broken, setBroken] = React.useState(false);
  const initials = initialsFromName(name);

  return (
    <span
      className="relative inline-flex select-none items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground ring-background overflow-hidden"
      style={{ width: size, height: size, boxShadow: `0 0 0 ${ring}px hsl(var(--background))`, ...style }}
      role="img"
      aria-label={name ? `${name} avatar` : "Avatar"}
      title={name || "Friend"}
    >
      {imageUrl && !broken ? (
        // plain <img> keeps bundle tiny; RNW maps it fine on web
        <img
          src={imageUrl}
          alt={name || "avatar"}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}

function OverflowChip({
  count, size, ring, style,
}: { count: number; size: number; ring: number; style?: React.CSSProperties }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold ring-background"
      style={{ width: size, height: size, boxShadow: `0 0 0 ${ring}px hsl(var(--background))`, ...style }}
      aria-label={`${count} more`}
      title={`${count} more`}
    >
      +{count}
    </span>
  );
}

function initialsFromName(name?: string) {
  if (!name) return "•";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
