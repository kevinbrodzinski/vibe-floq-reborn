import React from "react";

type Badge = { id: string; label: string; tone?: "cyan"|"raspberry"|"gold" };

function uniqByLabel(arr: Badge[]) {
  const seen = new Set<string>(); const out: Badge[] = [];
  for (const b of arr) { if (!seen.has(b.label)) { seen.add(b.label); out.push(b); } }
  return out;
}

export function FloqBadges({
  items, className = ""
}: { items: Badge[]; className?: string }) {
  const list = uniqByLabel(items).filter(b => b.label?.trim().length);

  return (
    <div className={`neon-surface flex flex-wrap gap-2 ${className}`}>
      {list.map(b => (
        <span key={b.id}
              className={`badge badge-xs badge-neon ${toneClass(b.tone)}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

function toneClass(t: Badge["tone"]) {
  if (t === "raspberry") return "badge-raspberry";
  if (t === "gold")      return "badge-gold";
  return "badge-cyan";
}