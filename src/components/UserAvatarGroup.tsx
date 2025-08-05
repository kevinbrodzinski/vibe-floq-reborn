import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarGroupProps {
  participants: Array<{
    id: string;
    display_name: string;
    avatar_url?: string;
  }>;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatarGroup = ({ 
  participants, 
  maxVisible = 3, 
  size = 'md',
  className = ""
}: UserAvatarGroupProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm', 
    lg: 'w-12 h-12 text-base'
  };

  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = Math.max(0, participants.length - maxVisible);

  return (
    <div 
      className={`flex items-center -space-x-2 ${className}`}
      role="group"
      aria-label={`${participants.length} participants`}
    >
      {visibleParticipants.map((participant, index) => (
        <Avatar 
          key={participant.id}
          className={`${sizeClasses[size]} border-2 border-background ring-2 ring-primary/20 transition-transform hover:scale-110 hover:z-10 relative`}
          style={{ zIndex: visibleParticipants.length - index }}
          title={participant.display_name}
        >
          <AvatarImage 
            src={participant.avatar_url} 
            alt={`${participant.display_name}'s avatar`} 
          />
          <AvatarFallback className="bg-gradient-primary text-primary-foreground font-medium">
            {participant.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      ))}
      
      {remainingCount > 0 && (
        <div className={`${sizeClasses[size]} bg-muted border-2 border-background rounded-full flex items-center justify-center text-muted-foreground font-medium`}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
};