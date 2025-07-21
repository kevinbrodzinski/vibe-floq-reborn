
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';

interface PlanCardProps {
  plan: {
    id: string;
    title: string;
    description?: string;
    status: string;
    planned_at: string;
    created_at: string;
    floqs?: {
      title: string;
    };
  };
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'draft':
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'invited':
        return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-1">{plan.title}</CardTitle>
          <Badge variant="outline" className={getStatusColor(plan.status)}>
            {plan.status}
          </Badge>
        </div>
        {plan.floqs?.title && (
          <p className="text-sm text-muted-foreground">
            Part of {plan.floqs.title}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {plan.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {plan.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(plan.planned_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
