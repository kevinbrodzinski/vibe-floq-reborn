import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Clock, 
  Coffee, 
  Music, 
  Car, 
  Plus,
  CheckCircle,
  XCircle,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Decision {
  id: string;
  type: "venue" | "time" | "activity" | "transport";
  question: string;
  options: {
    id: string;
    label: string;
    description?: string;
    votes: number;
    userVoted?: boolean;
  }[];
  status: "active" | "passed" | "failed" | "expired";
  deadline?: string;
  requiredVotes?: number;
  createdBy: string;
}

interface MemberStatus {
  profile_id: string;
  profiles: {
    display_name: string;
  } | null;
}

interface DecisionVotingSystemProps {
  floqId: string;
  members: MemberStatus[];
  onVote?: (decisionId: string, optionId: string) => void;
}

export function DecisionVotingSystem({ floqId, members, onVote }: DecisionVotingSystemProps) {
  // Mock decisions - in real app this would come from API/websocket
  const [decisions, setDecisions] = React.useState<Decision[]>([
    {
      id: "1",
      type: "venue",
      question: "Where should we go next?",
      options: [
        { id: "a", label: "The Rooftop Bar", description: "Great views, cocktails", votes: 3 },
        { id: "b", label: "Night Market", description: "Food, atmosphere", votes: 2, userVoted: true },
        { id: "c", label: "Stay here longer", description: "Current spot is good", votes: 1 }
      ],
      status: "active",
      deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      requiredVotes: Math.ceil(members.length * 0.6),
      createdBy: "Alex"
    },
    {
      id: "2",
      type: "time",
      question: "When should we leave?",
      options: [
        { id: "a", label: "In 15 minutes", votes: 1 },
        { id: "b", label: "In 30 minutes", votes: 4 },
        { id: "c", label: "In 1 hour", votes: 2 }
      ],
      status: "passed",
      requiredVotes: 4,
      createdBy: "Sam"
    }
  ]);

  const getDecisionIcon = (type: Decision["type"]) => {
    switch (type) {
      case "venue": return MapPin;
      case "time": return Clock;
      case "activity": return Music;
      case "transport": return Car;
      default: return CheckCircle;
    }
  };

  const getStatusColor = (status: Decision["status"]) => {
    switch (status) {
      case "active": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "passed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "expired": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleVote = (decisionId: string, optionId: string) => {
    setDecisions(prev => prev.map(decision => {
      if (decision.id !== decisionId || decision.status !== "active") return decision;
      
      return {
        ...decision,
        options: decision.options.map(option => ({
          ...option,
          votes: option.id === optionId ? option.votes + 1 : 
                  option.userVoted ? option.votes - 1 : option.votes,
          userVoted: option.id === optionId
        }))
      };
    }));
    
    onVote?.(decisionId, optionId);
  };

  const getTimeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "< 1m";
    return `${minutes}m`;
  };

  const activeDecisions = decisions.filter(d => d.status === "active");
  const completedDecisions = decisions.filter(d => d.status !== "active");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Group Decisions</div>
        <Button size="sm" variant="outline">
          <Plus className="w-3 h-3 mr-1" />
          New Vote
        </Button>
      </div>

      {/* Active Decisions */}
      {activeDecisions.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">ACTIVE VOTES</div>
          {activeDecisions.map(decision => {
            const Icon = getDecisionIcon(decision.type);
            const totalVotes = decision.options.reduce((sum, opt) => sum + opt.votes, 0);
            const topOption = decision.options.reduce((max, opt) => 
              opt.votes > max.votes ? opt : max
            );
            
            return (
              <Card key={decision.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {decision.question}
                    </CardTitle>
                    <Badge className={getStatusColor(decision.status)}>
                      Active
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>by {decision.createdBy}</span>
                    {decision.deadline && (
                      <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        <span>{getTimeRemaining(decision.deadline)}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-2">
                  {decision.options.map(option => {
                    const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                    
                    return (
                      <div key={option.id} className="space-y-1">
                        <Button
                          variant={option.userVoted ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-between h-auto p-2"
                          onClick={() => handleVote(decision.id, option.id)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{option.label}</div>
                            {option.description && (
                              <div className="text-xs opacity-70">{option.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {option.userVoted && <CheckCircle className="w-3 h-3" />}
                            <span className="text-xs">{option.votes}</span>
                          </div>
                        </Button>
                        <Progress value={percentage} className="h-1" />
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-between text-xs text-muted-foreground mt-3">
                    <span>{totalVotes} votes cast</span>
                    {decision.requiredVotes && (
                      <span>{decision.requiredVotes} needed to pass</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent Completed Decisions */}
      {completedDecisions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">RECENT DECISIONS</div>
            {completedDecisions.slice(0, 3).map(decision => {
              const Icon = getDecisionIcon(decision.type);
              const topOption = decision.options.reduce((max, opt) => 
                opt.votes > max.votes ? opt : max
              );
              
              return (
                <div key={decision.id} className="flex items-center gap-3 p-2 rounded bg-muted/20">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{decision.question}</div>
                    <div className="text-xs text-muted-foreground">
                      Chose: {topOption.label}
                    </div>
                  </div>
                  <Badge className={cn("text-xs", getStatusColor(decision.status))}>
                    {decision.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {decisions.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No active decisions. Start a vote to coordinate with your flock!
        </div>
      )}
    </div>
  );
}