import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Send, 
  Reply, 
  MoreHorizontal,
  Heart,
  Pin,
  Trash2,
  Edit3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StopComment {
  id: string;
  stop_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user_profile?: {
    display_name: string;
    avatar_url?: string;
  };
  replies?: StopComment[];
  likes_count?: number;
  user_liked?: boolean;
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
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments for this stop
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['stop-comments', stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stop_comments')
        .select(`
          id,
          stop_id,
          user_id,
          content,
          parent_id,
          is_pinned,
          created_at,
          updated_at,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('stop_id', stopId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Organize comments with replies
      const commentsMap = new Map();
      const rootComments: StopComment[] = [];

      (data || []).forEach(comment => {
        const commentWithProfile = {
          ...comment,
          user_profile: comment.profiles,
          replies: [],
          likes_count: 0, // TODO: Add likes functionality
          user_liked: false
        };
        commentsMap.set(comment.id, commentWithProfile);

        if (!comment.parent_id) {
          rootComments.push(commentWithProfile);
        }
      });

      // Add replies to parent comments
      (data || []).forEach(comment => {
        if (comment.parent_id) {
          const parent = commentsMap.get(comment.parent_id);
          if (parent) {
            parent.replies.push(commentsMap.get(comment.id));
          }
        }
      });

      // Sort: pinned comments first, then by date
      return rootComments.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return a.is_pinned ? -1 : 1;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
    enabled: !!stopId,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!session?.user?.id) throw new Error('Must be logged in to comment');

      const { error } = await supabase
        .from('stop_comments')
        .insert({
          stop_id: stopId,
          user_id: session.user.id,
          content: content.trim(),
          parent_id: parentId || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-comments', stopId] });
      setNewComment('');
      setReplyText('');
      setReplyingTo(null);
    },
    onError: (error) => {
      toast({
        title: "Comment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from('stop_comments')
        .update({ 
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', session?.user?.id); // Ensure user owns the comment

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-comments', stopId] });
      setEditingComment(null);
      setEditText('');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('stop_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', session?.user?.id); // Ensure user owns the comment

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-comments', stopId] });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment });
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyText.trim()) return;
    addCommentMutation.mutate({ content: replyText, parentId });
  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingComment(commentId);
    setEditText(currentContent);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editText.trim()) return;
    editCommentMutation.mutate({ commentId, content: editText });
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newComment]);

  useEffect(() => {
    if (replyTextareaRef.current) {
      replyTextareaRef.current.style.height = 'auto';
      replyTextareaRef.current.style.height = `${replyTextareaRef.current.scrollHeight}px`;
    }
  }, [replyText]);

  if (isLoading) {
    return (
      <div className={cn("animate-pulse space-y-3", className)}>
        <div className="h-4 bg-white/10 rounded w-32"></div>
        <div className="space-y-2">
          <div className="h-12 bg-white/10 rounded"></div>
          <div className="h-12 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  const CommentComponent = ({ comment, isReply = false }: { comment: StopComment; isReply?: boolean }) => (
    <div className={cn("space-y-2", isReply && "ml-8 pl-3 border-l-2 border-white/10")}>
      <div className="flex items-start gap-3">
        <Avatar className="w-6 h-6 flex-shrink-0">
          <AvatarImage src={comment.user_profile?.avatar_url || ''} />
          <AvatarFallback className="bg-gradient-primary text-xs">
            {comment.user_profile?.display_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">
              {comment.user_profile?.display_name || 'User'}
            </span>
            <span className="text-xs text-white/50">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.is_pinned && (
              <Pin className="w-3 h-3 text-yellow-400" />
            )}
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-white/40">(edited)</span>
            )}
          </div>

          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[60px] bg-white/5 border-white/20 text-white resize-none"
                placeholder="Edit your comment..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(comment.id)}
                  disabled={editCommentMutation.isPending || !editText.trim()}
                  className="bg-gradient-primary hover:opacity-90 h-7"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingComment(null)}
                  className="text-white/60 hover:bg-white/10 h-7"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/90 leading-relaxed break-words">
                {comment.content}
              </p>

              <div className="flex items-center gap-3 text-xs">
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(comment.id)}
                    className="text-white/60 hover:bg-white/10 h-6 px-2"
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                )}

                {comment.user_id === session?.user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:bg-white/10 h-6 px-2"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-black/90 border-white/20">
                      <DropdownMenuItem 
                        onClick={() => handleEditComment(comment.id, comment.content)}
                        className="text-white hover:bg-white/10"
                      >
                        <Edit3 className="w-3 h-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-400 hover:bg-red-500/10"
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

      {/* Reply Form */}
      {replyingTo === comment.id && (
        <div className="ml-9 space-y-2">
          <Textarea
            ref={replyTextareaRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="min-h-[60px] bg-white/5 border-white/20 text-white resize-none"
            placeholder={`Reply to ${comment.user_profile?.display_name}...`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmitReply(comment.id);
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleSubmitReply(comment.id)}
              disabled={addCommentMutation.isPending || !replyText.trim()}
              className="bg-gradient-primary hover:opacity-90 h-7"
            >
              <Send className="w-3 h-3 mr-1" />
              Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyingTo(null)}
              className="text-white/60 hover:bg-white/10 h-7"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentComponent key={reply.id} comment={reply} isReply={true} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-white/60" />
        <span className="text-sm font-medium text-white">
          Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </span>
      </div>

      {/* New Comment Form */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Avatar className="w-6 h-6 flex-shrink-0">
            <AvatarImage src={session?.user?.user_metadata?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-primary text-xs">
              {session?.user?.user_metadata?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] bg-white/5 border-white/20 text-white resize-none"
              placeholder="Add a comment about this stop..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmitComment();
                }
              }}
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmitComment}
            disabled={addCommentMutation.isPending || !newComment.trim()}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Send className="w-3 h-3 mr-1" />
            Comment
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div 
          className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          style={{ maxHeight }}
        >
          {comments.map((comment) => (
            <CommentComponent key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-white/50">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
}