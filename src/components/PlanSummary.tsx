import { Calendar, Clock, MapPin, Users, DollarSign, Tag } from "lucide-react";
import { UserAvatarGroup } from "./UserAvatarGroup";
import { PlanStatusTag } from "./PlanStatusTag";
import { formatTime } from "@/lib/timeUtils";

interface PlanStop {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  address?: string;
  estimated_cost_per_person?: number;
}

interface PlanParticipant {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface PlanSummaryProps {
  plan: {
    id: string;
    title: string;
    description?: string;
    planned_at: string;
    vibe_tags?: string[];
    budget_per_person?: number;
    status: string;
  };
  stops: PlanStop[];
  participants: PlanParticipant[];
  className?: string;
}

export const PlanSummary = ({
  plan,
  stops,
  participants,
  className = ""
}: PlanSummaryProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalEstimatedCost = () => {
    return stops.reduce((total, stop) => {
      return total + (stop.estimated_cost_per_person || 0);
    }, 0);
  };

  const getTimeRange = () => {
    const startTimes = stops
      .map(stop => stop.start_time)
      .filter(Boolean)
      .sort();
    const endTimes = stops
      .map(stop => stop.end_time)
      .filter(Boolean)
      .sort();

    if (startTimes.length === 0) return null;

    const firstStart = startTimes[0];
    const lastEnd = endTimes[endTimes.length - 1] || startTimes[startTimes.length - 1];

    return `${formatTime(firstStart!)} - ${formatTime(lastEnd!)}`;
  };

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-semibold">{plan.title}</h2>
          <PlanStatusTag status={plan.status as any} />
        </div>
        
        {plan.description && (
          <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{formatDate(plan.planned_at)}</span>
          </div>
          
          {getTimeRange() && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{getTimeRange()}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
          </div>
          
          {(plan.budget_per_person || getTotalEstimatedCost() > 0) && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span>
                ~${plan.budget_per_person || getTotalEstimatedCost()}/person
              </span>
            </div>
          )}
        </div>

        {plan.vibe_tags && plan.vibe_tags.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {plan.vibe_tags.map((vibe, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                >
                  {vibe}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Participants</span>
          <UserAvatarGroup participants={participants} maxVisible={8} size="sm" />
        </div>
      </div>

      {/* Stops Timeline */}
      <div className="p-4">
        <h3 className="text-sm font-medium mb-3">Itinerary ({stops.length} stops)</h3>
        
        <div className="space-y-3">
          {stops.map((stop, index) => (
            <div key={stop.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {index < stops.length - 1 && (
                  <div className="w-0.5 h-6 bg-border mt-1" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{stop.title}</h4>
                  {stop.start_time && (
                    <span className="text-xs text-muted-foreground">
                      {formatTime(stop.start_time)}
                    </span>
                  )}
                </div>
                
                {stop.address && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stop.address}</span>
                  </div>
                )}
                
                {stop.estimated_cost_per_person && stop.estimated_cost_per_person > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      ${stop.estimated_cost_per_person}/person
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};