import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openFloqPeek } from "@/lib/peek";

export function BusinessQuickCard({ item }: { item: any }) {
  return (
    <Card className="w-[240px] cursor-pointer transition hover:shadow-md" onClick={() => openFloqPeek(item.id)}>
      <CardHeader className="pb-1">
        <CardTitle className="truncate text-base">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {item.status === "live" ? "Live now" : "Upcoming"} • {(item.participants ?? 0)} in
      </CardContent>
    </Card>
  );
}