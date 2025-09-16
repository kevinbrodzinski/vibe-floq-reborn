import * as React from "react";
import { FloqCard, FloqCardItem } from "../cards/FloqCard";

export function TribesGrid({ items }: { items: FloqCardItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-2 sm:grid-cols-3">
      {items.map((it) => (
        <FloqCard key={it.id} item={it} kind="tribe" />
      ))}
    </div>
  );
}