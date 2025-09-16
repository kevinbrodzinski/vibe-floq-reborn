import * as React from "react";
import { FloqCardLarge, FloqLargeItem } from "@/components/floqs/cards/FloqCardLarge";
import { FloqCarousel } from "./FloqCarousel";

export type TribeItem = FloqLargeItem;

export function TribesRail({ items }: { items: TribeItem[] }) {
  if (!items?.length) return null;
  return (
    <FloqCarousel>
      {items.map((it) => <FloqCardLarge key={it.id} item={it} />)}
    </FloqCarousel>
  );
}