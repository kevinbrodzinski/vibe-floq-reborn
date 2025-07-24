import React from 'react';
import { Calendar, Users, MapPin } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface Plan {
  id: string;
  title: string;
  description?: string;
  planned_at: string;
  vibe_tags?: string[];
  floq?: {
    id: string;
    name: string;
    title: string;
    primary_vibe: string;
  };
}

interface PlanCardCompactProps {
  plan: Plan;
}

export const PlanCardCompact: React.FC<PlanCardCompactProps> = ({ plan }) => {
  const getVibeColor = (vibe: string) => {
    const colors = {
      'social': 'hsl(var(--chart-1))',
      'chill': 'hsl(var(--chart-2))',
      'hype': 'hsl(var(--chart-3))',
      'flowing': 'hsl(var(--chart-4))',
      'romantic': 'hsl(var(--chart-5))',
    };
    return colors[vibe as keyof typeof colors] || 'hsl(var(--muted-foreground))';
  };

  return (
    <div 
      className="space-y-2" 
      aria-label={`Plan: ${plan.title}${plan.floq ? ` in ${plan.floq.title || plan.floq.name}` : ''}`}
    >
      {/* Plan Title and Floq */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm truncate">{plan.title}</h4>
        {plan.floq && (
          <span 
            className="text-xs px-2 py-1 rounded-full text-white font-medium"
            style={{ backgroundColor: getVibeColor(plan.floq.primary_vibe) }}
          >
            {plan.floq.title || plan.floq.name}
          </span>
        )}
      </div>

      {/* Description */}
      {plan.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {plan.description}
        </p>
      )}

      {/* Plan Details */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>
            {formatDistance(new Date(plan.planned_at), new Date(), { addSuffix: true })}
          </span>
        </div>

        {plan.vibe_tags && plan.vibe_tags.length > 0 && (
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getVibeColor(plan.vibe_tags[0]) }}
            />
            <span className="capitalize">{plan.vibe_tags[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
};