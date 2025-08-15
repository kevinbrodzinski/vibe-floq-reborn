import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Users, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StopVote {
  id: string;
  stop_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
  user_profile?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface StopVotingProps {
  stopId: string;
  planId: string;
  className?: string;
  onVoteChange?: (stopId: string, upVotes: number, downVotes: number) => void;
}

export function StopVoting({ stopId, planId, className, onVoteChange }: StopVotingProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch votes for this stop
  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['stop-votes', stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stop_votes')
        .select(`
          id,
          stop_id,
          user_id,
          vote_type,
          created_at,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('stop_id', stopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(vote => ({
        ...vote,
        user_profile: vote.profiles
      })) as StopVote[];
    },
    enabled: !!stopId,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ voteType }: { voteType: 'up' | 'down' }) => {
      if (!session?.user?.id) throw new Error('Must be logged in to vote');

      // Check if user already voted
      const existingVote = votes.find(v => v.user_id === session.user.id);
      
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking same vote type
          const { error } = await supabase
            .from('stop_votes')
            .delete()
            .eq('id', existingVote.id);
          if (error) throw error;
        } else {
          // Update vote type
          const { error } = await supabase
            .from('stop_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          if (error) throw error;
        }
      } else {
        // Create new vote
        const { error } = await supabase
          .from('stop_votes')
          .insert({
            stop_id: stopId,
            user_id: session.user.id,
            vote_type: voteType
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-votes', stopId] });
    },
    onError: (error) => {
      toast({
        title: "Vote failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upVotes = votes.filter(v => v.vote_type === 'up');
  const downVotes = votes.filter(v => v.vote_type === 'down');
  const userVote = votes.find(v => v.user_id === session?.user?.id);
  
  const upCount = upVotes.length;
  const downCount = downVotes.length;
  const totalVotes = upCount + downCount;
  const approval = totalVotes > 0 ? Math.round((upCount / totalVotes) * 100) : 0;

  // Notify parent of vote changes
  useEffect(() => {
    if (onVoteChange) {
      onVoteChange(stopId, upCount, downCount);
    }
  }, [upCount, downCount, stopId, onVoteChange]);

  const handleVote = (voteType: 'up' | 'down') => {
    voteMutation.mutate({ voteType });
  };

  const getVoteStatus = () => {
    if (approval >= 75) return { icon: CheckCircle2, color: 'text-green-500', label: 'Strong Support' };
    if (approval >= 50) return { icon: TrendingUp, color: 'text-blue-500', label: 'Majority Support' };
    if (approval >= 25) return { icon: Clock, color: 'text-yellow-500', label: 'Mixed Support' };
    return { icon: XCircle, color: 'text-red-500', label: 'Needs Discussion' };
  };

  const voteStatus = getVoteStatus();

  if (isLoading) {
    return (
      <div className={cn("animate-pulse space-y-2", className)}>
        <div className="h-8 bg-white/10 rounded"></div>
        <div className="h-4 bg-white/10 rounded w-24"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Vote Buttons & Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('up')}
            disabled={voteMutation.isPending}
            className={cn(
              "h-8 px-2 rounded-full transition-all",
              userVote?.vote_type === 'up'
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "text-white/60 hover:bg-white/10 hover:text-green-400"
            )}
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
            {upCount}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('down')}
            disabled={voteMutation.isPending}
            className={cn(
              "h-8 px-2 rounded-full transition-all",
              userVote?.vote_type === 'down'
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "text-white/60 hover:bg-white/10 hover:text-red-400"
            )}
          >
            <ThumbsDown className="w-4 h-4 mr-1" />
            {downCount}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs border-white/20", voteStatus.color)}
          >
            <voteStatus.icon className="w-3 h-3 mr-1" />
            {approval}% approval
          </Badge>
          
          {totalVotes > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white/60 hover:bg-white/10 h-6 px-2 text-xs"
            >
              <Users className="w-3 h-3 mr-1" />
              {totalVotes}
            </Button>
          )}
        </div>
      </div>

      {/* Vote Status */}
      {totalVotes > 0 && (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <voteStatus.icon className={cn("w-3 h-3", voteStatus.color)} />
          <span>{voteStatus.label}</span>
          {totalVotes >= 3 && approval >= 75 && (
            <Badge variant="default" className="text-xs ml-auto bg-green-500/20 text-green-400">
              Ready to confirm
            </Badge>
          )}
        </div>
      )}

      {/* Expanded Vote Details */}
      {isExpanded && totalVotes > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          {upVotes.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-green-400 font-medium flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                Supporting ({upVotes.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {upVotes.map((vote) => (
                  <div key={vote.id} className="flex items-center gap-1 bg-green-500/10 rounded-full px-2 py-1">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={vote.user_profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-green-500/20 text-green-400 text-xs">
                        {vote.user_profile?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-green-400">
                      {vote.user_profile?.display_name || 'User'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {downVotes.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-red-400 font-medium flex items-center gap-1">
                <ThumbsDown className="w-3 h-3" />
                Opposing ({downVotes.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {downVotes.map((vote) => (
                  <div key={vote.id} className="flex items-center gap-1 bg-red-500/10 rounded-full px-2 py-1">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={vote.user_profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-red-500/20 text-red-400 text-xs">
                        {vote.user_profile?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-red-400">
                      {vote.user_profile?.display_name || 'User'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}