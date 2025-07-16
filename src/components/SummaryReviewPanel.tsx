import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Clock, Users, MapPin, DollarSign } from 'lucide-react';

interface Stop {
  id: string;
  title: string;
  venue: string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  votes: { positive: number; negative: number; total: number };
  status: 'confirmed' | 'pending';
}

interface Participant {
  id: string;
  name: string;
  rsvpStatus: 'attending' | 'maybe' | 'not_attending' | 'pending';
}

interface SummaryReviewPanelProps {
  planTitle: string;
  planDate: string;
  stops: Stop[];
  participants: Participant[];
  totalBudget: number;
  onFinalize: () => void;
  onEdit: (stopId: string) => void;
  className?: string;
}

export function SummaryReviewPanel({ 
  planTitle, 
  planDate, 
  stops, 
  participants, 
  totalBudget, 
  onFinalize, 
  onEdit,
  className = '' 
}: SummaryReviewPanelProps) {
  const attendingCount = participants.filter(p => p.rsvpStatus === 'attending').length;
  const maybeCount = participants.filter(p => p.rsvpStatus === 'maybe').length;
  const confirmedStops = stops.filter(s => s.status === 'confirmed').length;
  const totalDuration = stops.length * 2; // Assume 2 hours per stop

  return (
    <Card className={`p-6 space-y-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 ${className}`}>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Plan Summary
        </h3>
        <p className="text-sm text-muted-foreground">
          Review your plan before finalizing and starting execution
        </p>
      </div>

      {/* Plan Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-lg bg-background/50">
          <div className="text-lg font-semibold text-primary">{stops.length}</div>
          <div className="text-xs text-muted-foreground">Total Stops</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50">
          <div className="text-lg font-semibold text-green-600">{confirmedStops}</div>
          <div className="text-xs text-muted-foreground">Confirmed</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50">
          <div className="text-lg font-semibold text-blue-600">{attendingCount + maybeCount}</div>
          <div className="text-xs text-muted-foreground">Attendees</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50">
          <div className="text-lg font-semibold text-purple-600">${totalBudget}</div>
          <div className="text-xs text-muted-foreground">Est. Budget</div>
        </div>
      </div>

      {/* Plan Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Plan Title:</span>
          <span className="font-medium">{planTitle}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Date:</span>
          <span className="font-medium">{planDate}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Duration:</span>
          <span className="font-medium">~{totalDuration} hours</span>
        </div>
      </div>

      {/* Stops List */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Itinerary</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {stops.map((stop, index) => (
            <div 
              key={stop.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
              onClick={() => onEdit(stop.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="text-xs font-medium text-muted-foreground w-8">
                  {index + 1}.
                </div>
                <div>
                  <div className="font-medium text-sm">{stop.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {stop.startTime} - {stop.endTime}
                    <MapPin className="h-3 w-3 ml-1" />
                    {stop.venue}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <div className={`px-2 py-1 rounded-full ${
                  stop.status === 'confirmed' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {stop.status}
                </div>
                <div className="text-muted-foreground">
                  {stop.votes.positive}/{stop.votes.total} ✓
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Participants</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 rounded bg-green-50 text-green-700">
            <div className="font-medium">{attendingCount}</div>
            <div>Attending</div>
          </div>
          <div className="text-center p-2 rounded bg-yellow-50 text-yellow-700">
            <div className="font-medium">{maybeCount}</div>
            <div>Maybe</div>
          </div>
          <div className="text-center p-2 rounded bg-gray-50 text-gray-700">
            <div className="font-medium">{participants.length - attendingCount - maybeCount}</div>
            <div>Pending</div>
          </div>
        </div>
      </div>

      {/* Finalize Button */}
      <div className="pt-4 border-t">
        <Button 
          onClick={onFinalize}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium"
          size="lg"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Finalize & Start Execution
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          This will lock the plan and begin the execution phase
        </p>
      </div>
    </Card>
  );
}