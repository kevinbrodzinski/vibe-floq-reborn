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
  Clock,
  Heart,
  Meh
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StopVote {
  id: string;
  plan_id: string;
  stop_id: string;
  profile_id: string | null;
  guest_id: string | null;
  vote_type: 'upvote' | 'downvote' | 'maybe';
  emoji_reaction: string | null;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface StopVotingProps {
  stopId: string;
  planId: string;
  className?: string;
  onVoteChange?: (stopId: string, voteType: string | null, totalVotes: number) => void;
}

export function StopVoting({ stopId, planId, className, onVoteChange }: StopVotingProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isVoting, setIsVoting] = useState(false);

  // Get current user's profile_id
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  // Fetch votes for this stop
  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['stop-votes', stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_stop_votes')
        .select(`
          id,
          plan_id,
          stop_id,
          profile_id,
          guest_id,
          vote_type,
          emoji_reaction,
          created_at,
          profiles:profile_id (
            display_name,
            avatar_url
          )
        `)
        .eq('stop_id', stopId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stop votes:', error);
        throw error;
      }

      return data as StopVote[];
    },
    enabled: !!stopId,
    refetchOnWindowFocus: false,
    staleTime: 30000
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ voteType }: { voteType: 'upvote' | 'downvote' | 'maybe' | null }) => {
      if (!currentProfile?.id) throw new Error('Must be logged in to vote');

      // Check if user already voted
      const existingVote = votes.find(v => v.profile_id === currentProfile.id);

      if (voteType === null) {
        // Delete vote
        if (existingVote) {
          const { error } = await supabase
            .from('plan_stop_votes')
            .delete()
            .eq('id', existingVote.id);
          
          if (error) throw error;
        }
      } else if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from('plan_stop_votes')
          .update({ 
            vote_type: voteType,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVote.id);
          
        if (error) throw error;
      } else {
        // Create new vote
        const { error } = await supabase
          .from('plan_stop_votes')
          .insert({
            plan_id: planId,
            stop_id: stopId,
            profile_id: currentProfile.id,
            vote_type: voteType
          });
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-votes', stopId] });
      const totalVotes = votes.length;
      onVoteChange?.(stopId, null, totalVotes); // Will be updated after refetch
    },
    onError: (error) => {
      console.error('Vote error:', error);
      toast({
        title: 'Failed to vote',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleVote = async (voteType: 'upvote' | 'downvote' | 'maybe') => {
    if (isVoting) return;
    
    setIsVoting(true);
    try {
      const currentVote = votes.find(v => v.profile_id === currentProfile?.id);
      const newVoteType = currentVote?.vote_type === voteType ? null : voteType;
      
      await voteMutation.mutateAsync({ voteType: newVoteType });
    } finally {
      setIsVoting(false);
    }
  };

  // Calculate vote counts
  const upvotes = votes.filter(v => v.vote_type === 'upvote').length;
  const downvotes = votes.filter(v => v.vote_type === 'downvote').length;
  const maybes = votes.filter(v => v.vote_type === 'maybe').length;
  const totalVotes = votes.length;
  
  // Calculate approval percentage
  const approvalPercentage = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 0;
  
  // Get current user's vote
  const currentUserVote = votes.find(v => v.profile_id === currentProfile?.id);

  // Get vote icon
  const getVoteIcon = (type: 'upvote' | 'downvote' | 'maybe') => {
    switch (type) {
      case 'upvote': return ThumbsUp;
      case 'downvote': return ThumbsDown;
      case 'maybe': return Meh;
      default: return ThumbsUp;
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-white/60", className)}>
        <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
        <span className="text-sm">Loading votes...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Vote Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('upvote')}
          disabled={isVoting || !currentProfile}
          className={cn(
            "h-8 px-2 text-white/60 hover:text-green-400 hover:bg-green-500/20",
            currentUserVote?.vote_type === 'upvote' && "text-green-400 bg-green-500/20"
          )}
        >
          <ThumbsUp className="w-4 h-4 mr-1" />
          {upvotes}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('maybe')}
          disabled={isVoting || !currentProfile}
          className={cn(
            "h-8 px-2 text-white/60 hover:text-yellow-400 hover:bg-yellow-500/20",
            currentUserVote?.vote_type === 'maybe' && "text-yellow-400 bg-yellow-500/20"
          )}
        >
          <Meh className="w-4 h-4 mr-1" />
          {maybes}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('downvote')}
          disabled={isVoting || !currentProfile}
          className={cn(
            "h-8 px-2 text-white/60 hover:text-red-400 hover:bg-red-500/20",
            currentUserVote?.vote_type === 'downvote' && "text-red-400 bg-red-500/20"
          )}
        >
          <ThumbsDown className="w-4 h-4 mr-1" />
          {downvotes}
        </Button>

        {/* Approval percentage */}
        {totalVotes > 0 && (
          <Badge 
            variant="secondary" 
            className={cn(
              "ml-2 text-xs",
              approvalPercentage >= 70 ? "bg-green-500/20 text-green-400" :
              approvalPercentage >= 50 ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            )}
          >
            {approvalPercentage}% approval
          </Badge>
        )}
      </div>

      {/* Vote Summary */}
      {totalVotes > 0 && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Users className="w-3 h-3" />
          <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
          
          {/* Recent voters */}
          <div className="flex -space-x-1 ml-2">
            {votes.slice(0, 3).map((vote) => (
              <Avatar key={vote.id} className="w-5 h-5 border border-white/20">
                <AvatarImage src={vote.profiles?.avatar_url} />
                <AvatarFallback className="text-xs bg-white/10">
                  {vote.profiles?.display_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
            {votes.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] text-white/60">
                +{votes.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No votes state */}
      {totalVotes === 0 && (
        <div className="text-xs text-white/40 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Be the first to vote on this stop</span>
        </div>
      )}
    </div>
  );
}