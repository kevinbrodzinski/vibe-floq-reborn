import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Reply, MoreHorizontal, Heart, Pin, Trash2, Edit3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface StopComment {
  id: string;
  plan_id: string;
  stop_id: string | null;
  content: string;
  mentioned_users: string[] | null;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
  profile_id: string | null;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
  replies?: StopComment[];
}

interface StopCommentsProps {
  stopId: string;
  planId: string;
  className?: string;
  maxHeight?: string;
}

export function StopComments({ stopId, planId, className, maxHeight = "300px" }: StopCommentsProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get current user's profile_id
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', session.user.id)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  // Fetch comments for this stop
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['stop-comments', stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_comments')
        .select(`
          id,
          plan_id,
          stop_id,
          content,
          mentioned_users,
          reply_to_id,
          created_at,
          updated_at,
          profile_id,
          profiles:profile_id (
            display_name,
            avatar_url
          )
        `)
        .eq('stop_id', stopId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching stop comments:', error);
        throw error;
      }

      // Group comments by parent/child relationships
      const commentMap = new Map<string, StopComment>();
      const rootComments: StopComment[] = [];

      // First pass: create all comment objects
      (data as StopComment[]).forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      // Second pass: organize parent/child relationships
      commentMap.forEach(comment => {
        if (comment.reply_to_id) {
          const parent = commentMap.get(comment.reply_to_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      return rootComments;
    },
    enabled: !!stopId,
    refetchOnWindowFocus: false,
    staleTime: 30000
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({ content, replyToId }: { content: string; replyToId?: string }) => {
      if (!currentProfile?.id) throw new Error('Must be logged in to comment');

      const { error } = await supabase
        .from('plan_comments')
        .insert({
          plan_id: planId,
          stop_id: stopId,
          content: content.trim(),
          reply_to_id: replyToId || null,
          profile_id: currentProfile.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-comments', stopId] });
      setNewComment('');
      setReplyingTo(null);
    },
    onError: (error) => {
      console.error('Comment error:', error);
      toast({
        title: 'Failed to post comment',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!currentProfile?.id) throw new Error('Must be logged in to edit');

      const { error } = await supabase
        .from('plan_comments')
        .update({ 
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('profile_id', currentProfile.id); // Ensure user can only edit their own comments

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-comments', stopId] });
      setEditingComment(null);
      setEditContent('');
    },
    onError: (error) => {
      console.error('Edit comment error:', error);
      toast({
        title: 'Failed to update comment',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!currentProfile?.id) throw new Error('Must be logged in to delete');

      const { error } = await supabase
        .from('plan_comments')
        .delete()
        .eq('id', commentId)
        .eq('profile_id', currentProfile.id); // Ensure user can only delete their own comments

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-comments', stopId] });
    },
    onError: (error) => {
      console.error('Delete comment error:', error);
      toast({
        title: 'Failed to delete comment',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentProfile) return;

    await createCommentMutation.mutateAsync({ 
      content: newComment,
      replyToId: replyingTo || undefined
    });
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    textareaRef.current?.focus();
  };

  const handleEdit = (comment: StopComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !editingComment) return;

    await updateCommentMutation.mutateAsync({
      commentId: editingComment,
      content: editContent
    });
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    await deleteCommentMutation.mutateAsync(commentId);
  };

  const renderComment = (comment: StopComment, isReply = false) => {
    const isOwner = comment.profile_id === currentProfile?.id;
    const isEditing = editingComment === comment.id;

    return (
      <div key={comment.id} className={cn(
        "group relative transition-all duration-200",
        isReply ? "ml-6 pl-4 border-l-2 border-white/10" : "space-y-3"
      )}>
        <div className="flex items-start gap-3">
          <Avatar className={cn(
            "flex-shrink-0 ring-2 ring-transparent transition-all duration-200",
            "group-hover:ring-white/20",
            isReply ? "w-5 h-5" : "w-7 h-7"
          )}>
            <AvatarImage src={comment.profiles?.avatar_url} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
              {comment.profiles?.display_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="font-semibold text-white/90 truncate">
                {comment.profiles?.display_name || 'Anonymous'}
              </span>
              <span className="text-white/30">•</span>
              <span className="whitespace-nowrap">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.updated_at !== comment.created_at && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="italic text-white/50">edited</span>
                </>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] bg-white/5 border-white/20 text-white resize-none rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="Edit your comment..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || updateCommentMutation.isPending}
                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 rounded-full font-medium transition-all duration-200 hover:scale-105"
                  >
                    {updateCommentMutation.isPending ? (
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : null}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                    className="h-8 px-4 text-white/60 hover:text-white/80 hover:bg-white/10 rounded-full transition-all duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={cn(
                  "bg-white/5 rounded-lg px-3 py-2.5 transition-all duration-200",
                  "group-hover:bg-white/8",
                  isReply && "bg-white/3 group-hover:bg-white/6"
                )}>
                  <p className="text-sm text-white/95 leading-relaxed break-words">
                    {comment.content}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {!isReply && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReply(comment.id)}
                        className="h-7 px-3 text-xs text-white/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-all duration-200 group/reply"
                      >
                        <Reply className="w-3 h-3 mr-1.5 transition-transform duration-200 group-hover/reply:scale-110" />
                        Reply
                      </Button>
                    )}
                  </div>

                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 bg-black/90 border-white/20">
                        <DropdownMenuItem 
                          onClick={() => handleEdit(comment)}
                          className="text-white hover:bg-white/10 focus:bg-white/10"
                        >
                          <Edit3 className="w-3 h-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(comment.id)}
                          className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Comments skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="group relative transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-white/5 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-3 bg-white/5 rounded animate-pulse" />
                  <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
                </div>
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="w-full h-3 bg-white/10 rounded animate-pulse" />
                  <div className="w-3/4 h-3 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="w-16 h-6 bg-white/5 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        ))}
        
        {/* New comment form skeleton */}
        <div className="border-t border-white/10 pt-4">
          <div className="flex gap-3">
            <div className="w-7 h-7 bg-white/5 rounded-full animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
              <div className="flex justify-between">
                <div className="w-32 h-4 bg-white/5 rounded animate-pulse" />
                <div className="w-20 h-8 bg-white/5 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Comments List */}
      <div 
        className="space-y-4 overflow-y-auto pr-2"
        style={{ maxHeight }}
      >
        {comments.length > 0 ? (
          comments.map(comment => renderComment(comment))
        ) : (
          <div className="text-center py-6 text-white/40">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Be the first to share your thoughts</p>
          </div>
        )}
      </div>

      {/* New Comment Form */}
      {currentProfile && (
        <div className="border-t border-white/10 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {replyingTo && (
              <div className="flex items-center gap-3 text-xs text-white/60 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                <Reply className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white/80">Replying to comment</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="ml-auto h-6 px-2 text-white/50 hover:text-white/80 hover:bg-white/10 rounded-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Avatar className="w-7 h-7 flex-shrink-0 mt-1 ring-2 ring-transparent transition-all duration-200 hover:ring-white/20">
                <AvatarImage src={currentProfile.avatar_url} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                  {currentProfile.display_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyingTo ? "Write a thoughtful reply..." : "Share your thoughts..."}
                  className="min-h-[80px] bg-white/5 border-white/20 text-white resize-none rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200 placeholder:text-white/40"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />

                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/40 flex items-center gap-1">
                    <span>Press</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded border border-white/20">⌘</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded border border-white/20">Enter</kbd>
                    <span>to post</span>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 rounded-full font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createCommentMutation.isPending ? (
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                      <Send className="w-3 h-3 mr-2" />
                    )}
                    {replyingTo ? 'Reply' : 'Comment'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Login prompt */}
      {!currentProfile && (
        <div className="text-center py-4 text-white/60 border-t border-white/10">
          <p className="text-sm">Sign in to join the discussion</p>
        </div>
      )}
    </div>
  );
}