import * as React from "react";
import { useListSort, SortKey } from "@/hooks/useListSort";

export function SortBar() {
  const { sort, setSort } = useListSort();
  const Chip = ({k, label}: {k:SortKey; label:string}) => (
    <button
      onClick={()=>setSort(k)}
      aria-pressed={sort===k}
      className={`rounded-full px-3 py-1 text-xs transition
        ${sort===k ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "bg-secondary text-secondary-foreground"}`}
    >{label}</button>
  );
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <Chip k="best"    label="Best" />
      <Chip k="live"    label="Live now" />
      <Chip k="soon"    label="Ending soon" />
      <Chip k="energy"  label="Energy" />
      <Chip k="friends" label="Friends first" />
    </div>
  );
}

/** Apply the chosen sort to a list of floqs */
export function sortFloqs(items: any[], sort: SortKey) {
  const now = Date.now();
  switch (sort) {
    case "live":    return [...items].sort((a,b)=> (a.status==="live"?0:1) - (b.status==="live"?0:1));
    case "soon":    return [...items].sort((a,b)=> (+new Date(a.ends_at??now)) - (+new Date(b.ends_at??now)));
    case "energy":  return [...items].sort((a,b)=> (b.energy_now??0)-(a.energy_now??0));
    case "friends": return [...items].sort((a,b)=> (b.friends_in??0)-(a.friends_in??0));
    default:        return [...items].sort((a,b)=> (b.recsys_score??0)-(a.recsys_score??0));
  }
}