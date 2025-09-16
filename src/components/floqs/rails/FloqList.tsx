import * as React from "react";
import { FloqRow, FloqRowItem } from "@/components/floqs/rows/FloqRow";

export function FloqList({ items }: { items: FloqRowItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-col gap-3 px-2 py-2">
      {items.map((it) => <FloqRow key={it.id} item={it} />)}
    </div>
  );
}