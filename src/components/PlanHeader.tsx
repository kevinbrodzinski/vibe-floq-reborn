import { Users, Settings, MessageCircle, Calendar, Clock } from "lucide-react";
import { UserAvatarGroup } from "./UserAvatarGroup";
import { PlanStatusTag } from "./PlanStatusTag";

interface PlanHeaderProps {
  title: string;
  date: string;
  startTime?: string;
  participantCount: number;
  participants: Array<{
    id: string;
    display_name: string;
    avatar_url?: string;
  }>;
  status: 'draft' | 'active' | 'voting' | 'finalized' | 'executing';
  showChat: boolean;
  onChatToggle: () => void;
  onSettingsClick?: () => void;
}

export const PlanHeader = ({ 
  title, 
  date, 
  startTime,
  participantCount, 
  participants,
  status,
  showChat, 
  onChatToggle,
  onSettingsClick 
}: PlanHeaderProps) => {
  return (
    <div className="p-6 pt-16">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            {title}
          </h1>
          
          <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
            </div>
            
            {startTime && (
              <>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{startTime}</span>
                </div>
              </>
            )}
            
            <span>•</span>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{participantCount} people</span>
            </div>
            
            <span>•</span>
            <PlanStatusTag status={status} />
          </div>

          <div className="flex items-center space-x-4">
            <UserAvatarGroup participants={participants} maxVisible={5} />
            {participantCount > 5 && (
              <span className="text-sm text-muted-foreground">
                +{participantCount - 5} more
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={onChatToggle}
            className={`p-3 rounded-xl transition-all duration-300 ${
              showChat 
                ? 'bg-primary text-primary-foreground glow-primary' 
                : 'bg-card/50 text-muted-foreground hover:bg-card/80'
            }`}
          >
            <MessageCircle size={20} />
          </button>
          
          {onSettingsClick && (
            <button 
              onClick={onSettingsClick}
              className="p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-all duration-300"
            >
              <Settings size={20} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};