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
      
      // Add haptic feedback for better UX (if available)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
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
      <div className={cn("space-y-4", className)}>
        {/* Vote buttons skeleton */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="h-9 px-3 rounded-full bg-white/5 animate-pulse flex items-center gap-2"
            >
              <div className="w-4 h-4 bg-white/10 rounded" />
              <div className="w-4 h-4 bg-white/10 rounded" />
            </div>
          ))}
          <div className="ml-3 flex items-center gap-2">
            <div className="h-2 w-16 rounded-full bg-white/5 animate-pulse" />
            <div className="h-6 w-12 rounded-full bg-white/5 animate-pulse" />
          </div>
        </div>
        
        {/* Summary skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-4 bg-white/5 rounded animate-pulse" />
            <div className="w-24 h-3 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex -space-x-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-6 h-6 bg-white/5 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Vote Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('upvote')}
          disabled={isVoting || !currentProfile}
                      className={cn(
              "h-10 px-4 rounded-full transition-all duration-200 group touch-manipulation",
              "text-white/50 hover:text-green-400 hover:bg-green-500/10 hover:scale-105 active:scale-95",
              "border border-transparent hover:border-green-500/20",
              "min-w-[60px] sm:min-w-[50px]",
              currentUserVote?.vote_type === 'upvote' && 
              "text-green-400 bg-green-500/15 border-green-500/30 shadow-sm shadow-green-500/20"
            )}
        >
          <ThumbsUp className={cn(
            "w-4 h-4 mr-2 transition-transform duration-200",
            "group-hover:scale-110",
            currentUserVote?.vote_type === 'upvote' && "scale-110"
          )} />
          <span className="font-medium tabular-nums transition-all duration-200 group-hover:scale-110">{upvotes}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('maybe')}
          disabled={isVoting || !currentProfile}
                      className={cn(
              "h-10 px-4 rounded-full transition-all duration-200 group touch-manipulation",
              "text-white/50 hover:text-amber-400 hover:bg-amber-500/10 hover:scale-105 active:scale-95",
              "border border-transparent hover:border-amber-500/20",
              "min-w-[60px] sm:min-w-[50px]",
              currentUserVote?.vote_type === 'maybe' && 
              "text-amber-400 bg-amber-500/15 border-amber-500/30 shadow-sm shadow-amber-500/20"
            )}
        >
          <Meh className={cn(
            "w-4 h-4 mr-2 transition-transform duration-200",
            "group-hover:scale-110",
            currentUserVote?.vote_type === 'maybe' && "scale-110"
          )} />
          <span className="font-medium tabular-nums transition-all duration-200 group-hover:scale-110">{maybes}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('downvote')}
          disabled={isVoting || !currentProfile}
                      className={cn(
              "h-10 px-4 rounded-full transition-all duration-200 group touch-manipulation",
              "text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:scale-105 active:scale-95",
              "border border-transparent hover:border-red-500/20",
              "min-w-[60px] sm:min-w-[50px]",
              currentUserVote?.vote_type === 'downvote' && 
              "text-red-400 bg-red-500/15 border-red-500/30 shadow-sm shadow-red-500/20"
            )}
        >
          <ThumbsDown className={cn(
            "w-4 h-4 mr-2 transition-transform duration-200",
            "group-hover:scale-110",
            currentUserVote?.vote_type === 'downvote' && "scale-110"
          )} />
          <span className="font-medium tabular-nums transition-all duration-200 group-hover:scale-110">{downvotes}</span>
        </Button>

        {/* Approval percentage */}
        {totalVotes > 0 && (
          <div className="ml-2 sm:ml-3 flex items-center gap-2 flex-shrink-0">
            <div className={cn(
              "h-2 w-12 sm:w-16 rounded-full bg-white/10 overflow-hidden",
              "relative"
            )}>
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  approvalPercentage >= 70 ? "bg-green-400" :
                  approvalPercentage >= 50 ? "bg-amber-400" :
                  "bg-red-400"
                )}
                style={{ width: `${Math.max(approvalPercentage, 8)}%` }}
              />
            </div>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full border-0 whitespace-nowrap",
                "transition-colors duration-200",
                approvalPercentage >= 70 ? "bg-green-500/20 text-green-400" :
                approvalPercentage >= 50 ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
              )}
            >
              {approvalPercentage}%
            </Badge>
          </div>
        )}
      </div>

      {/* Vote Summary */}
      {totalVotes > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-white/60">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium">
                {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
              </span>
            </div>
            
            {/* Vote breakdown */}
            <div className="flex items-center gap-3 text-[11px]">
              {upvotes > 0 && (
                <span className="text-green-400/80">
                  {upvotes} up
                </span>
              )}
              {maybes > 0 && (
                <span className="text-amber-400/80">
                  {maybes} maybe
                </span>
              )}
              {downvotes > 0 && (
                <span className="text-red-400/80">
                  {downvotes} down
                </span>
              )}
            </div>
          </div>
          
          {/* Recent voters */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {votes.slice(0, 4).map((vote, index) => (
                <Avatar 
                  key={vote.id} 
                  className={cn(
                    "w-6 h-6 border-2 border-black/50 transition-transform duration-200",
                    "hover:scale-110 hover:z-10 relative",
                    index === 0 && "z-[4]",
                    index === 1 && "z-[3]",
                    index === 2 && "z-[2]",
                    index === 3 && "z-[1]"
                  )}
                  title={vote.profiles?.display_name || 'Anonymous'}
                >
                  <AvatarImage src={vote.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                    {vote.profiles?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {votes.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-black/50 flex items-center justify-center text-[10px] text-white/70 font-medium z-0">
                  +{votes.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No votes state */}
      {totalVotes === 0 && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-xs text-white/40 bg-white/5 rounded-full px-3 py-1.5">
            <Clock className="w-3 h-3" />
            <span>Be the first to vote</span>
          </div>
        </div>
      )}
    </div>
  );
}