import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent
} from "@/components/ui/timeline";
import { useParams, Link } from "react-router-dom";
import { useAfterglowDetail } from "@/lib/afterglow-helpers";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Loader, AlertCircle } from "lucide-react";

export default function AfterglowDetailPage() {
  const { afterglowId } = useParams<{ afterglowId: string }>();
  
  if (!afterglowId) return <p>Invalid afterglow id</p>;
  
  const { data, isLoading, isError, error } = useAfterglowDetail(afterglowId);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin mr-2" /> Loading afterglow…
      </div>
    );

  if (isError)
    return (
      <div className="flex items-center justify-center h-full text-red-600">
        <AlertCircle className="mr-2" /> {error?.message || "Error loading afterglow"}
      </div>
    );

  if (!data) return null;

  const { afterglow, moments } = data;

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">
          {format(new Date(afterglow.date), "PPP")}
        </h1>

        {afterglow.summary_text && (
          <p className="text-muted-foreground">{afterglow.summary_text}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Badge>{afterglow.dominant_vibe}</Badge>
          <Badge variant="outline">
            Energy {afterglow.energy_score}/100
          </Badge>
          <Badge variant="outline">
            Social {afterglow.social_intensity}/100
          </Badge>
          <Badge variant="outline">{afterglow.total_venues} venues</Badge>
          <Badge variant="outline">{moments.length} moments</Badge>
          {afterglow.is_pinned && <Badge variant="outline">Pinned</Badge>}
        </div>
      </header>

      {/* Timeline */}
      <Timeline>
        {moments.map((m, i) => (
          <TimelineItem key={m.id}>
            <TimelineSeparator>
              <TimelineDot color={m.color ?? "#6b7280"} />
              {i < moments.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <div className="pb-8">
                <time className="block text-xs text-muted-foreground">
                  {format(new Date(m.timestamp), "p")}
                </time>
                <h3 className="font-medium">{m.title}</h3>
                {m.description && (
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                )}
              </div>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>

      {/* Navigation back */}
      <Link to="/archive" className="text-sm text-primary hover:underline">
        ← Back to Archive
      </Link>
    </div>
  );
}