import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export interface PerfectTimingCardProps {
  title?: string;
  description?: string;
  timeText?: string;
}

export function PerfectTimingCard({ 
  title = "Perfect timing", 
  description = "Your favorite spot is free right now",
  timeText = "Now"
}: PerfectTimingCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur border border-border/50 hover:-translate-y-[1px] transition-transform">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center space-x-1 text-xs text-accent">
            <Clock className="h-3 w-3" />
            <span>{timeText}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}