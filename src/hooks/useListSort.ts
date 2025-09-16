import * as React from "react";
export type SortKey = "best" | "live" | "soon" | "energy" | "friends";

export function useListSort() {
  const [sort, setSort] = React.useState<SortKey>(() => {
    if (typeof window === "undefined") return "best";
    const q = new URL(window.location.href).searchParams.get("sort");
    return (["best","live","soon","energy","friends"] as SortKey[]).includes(q as any) ? (q as SortKey) : "best";
  });
  React.useEffect(()=> {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href); u.searchParams.set("sort", sort);
    window.history.replaceState({}, "", u.toString());
  }, [sort]);
  return { sort, setSort };
}