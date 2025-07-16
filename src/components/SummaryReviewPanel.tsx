import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Star,
  Calendar,
  Edit3
} from 'lucide-react';

interface PlanStop {
  id: string;
  title: string;
  venue: string;
  startTime: string;
  endTime: string;
  estimatedCost?: number;
  votes: { positive: number; negative: number; total: number };
  status: 'confirmed' | 'disputed' | 'pending';
}

interface SummaryReviewPanelProps {
  planTitle: string;
  planDate: string;
  stops: PlanStop[];
  participants: { id: string; name: string; rsvpStatus: string }[];
  totalBudget?: number;
  onFinalize: () => void;
  onEdit: (stopId: string) => void;
  className?: string;
}

export const SummaryReviewPanel = ({
  planTitle,
  planDate,
  stops,
  participants,
  totalBudget,
  onFinalize,
  onEdit,
  className = ""
}: SummaryReviewPanelProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const attendingCount = participants.filter(p => p.rsvpStatus === 'attending').length;
  const confirmedStops = stops.filter(s => s.status === 'confirmed').length;
  const totalVotes = stops.reduce((sum, stop) => sum + stop.votes.total, 0);
  const avgVoteScore = totalVotes > 0 ? 
    stops.reduce((sum, stop) => sum + (stop.votes.positive / Math.max(stop.votes.total, 1)), 0) / stops.length * 100 : 0;
  
  const readinessScore = Math.round(
    (confirmedStops / stops.length * 40) + 
    (attendingCount / participants.length * 30) + 
    (avgVoteScore / 100 * 30)
  );

  const isReadyToFinalize = readinessScore >= 75 && confirmedStops === stops.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card/95 backdrop-blur-xl rounded-2xl border border-border/30 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{planTitle}</h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
              <Calendar className="w-4 h-4" />
              <span>{planDate}</span>
            </div>
          </div>
          
          <Badge 
            variant={isReadyToFinalize ? "default" : "secondary"}
            className="text-sm"
          >
            {readinessScore}% Ready
          </Badge>
        </div>

        {/* Readiness Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plan Readiness</span>
            <span className="font-medium">{readinessScore}%</span>
          </div>
          <Progress value={readinessScore} className="h-2" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 bg-muted/20">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1 bg-primary/10 rounded-full">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold">{attendingCount}</div>
            <div className="text-xs text-muted-foreground">Attending</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1 bg-green-500/10 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-bold">{confirmedStops}</div>
            <div className="text-xs text-muted-foreground">Confirmed</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1 bg-yellow-500/10 rounded-full">
              <Star className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="text-lg font-bold">{Math.round(avgVoteScore)}%</div>
            <div className="text-xs text-muted-foreground">Approval</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1 bg-blue-500/10 rounded-full">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold">${totalBudget || 0}</div>
            <div className="text-xs text-muted-foreground">Budget</div>
          </div>
        </div>
      </div>

      {/* Stops Summary */}
      <div className="p-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-left mb-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {stops.length} Stops {showDetails ? '▼' : '▶'}
        </button>
        
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="space-y-3"
          >
            {stops.map((stop, index) => (
              <div 
                key={stop.id}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{stop.title}</span>
                    <Badge 
                      variant={
                        stop.status === 'confirmed' ? 'default' : 
                        stop.status === 'disputed' ? 'destructive' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {stop.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{stop.startTime}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{stop.venue}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>{stop.votes.positive}/{stop.votes.total}</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(stop.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border/30 bg-muted/10">
        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowDetails(!showDetails)}
          >
            Review Details
          </Button>
          
          <Button
            onClick={onFinalize}
            disabled={!isReadyToFinalize}
            className="flex-1 bg-gradient-primary hover:opacity-90"
          >
            {isReadyToFinalize ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalize Plan
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Need {100 - readinessScore}% More
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};