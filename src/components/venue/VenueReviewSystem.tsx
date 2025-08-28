import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  profileId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
  tags: string[];
}

interface VenueReviewSystemProps {
  venueId: string;
  venueName: string;
  userReview?: Review | null;
  onReviewSubmit?: (rating: number, comment: string, tags: string[]) => void;
}

const reviewTags = [
  '🍕 Great Food',
  '☕ Good Coffee', 
  '🎵 Good Music',
  '📶 Good WiFi',
  '🪑 Comfortable',
  '👥 Social Vibe',
  '🤫 Quiet Space',
  '💰 Good Value',
  '🚗 Easy Parking',
  '♿ Accessible'
];

// Mock reviews data - in real app this would come from your database
const mockReviews: Review[] = [
  {
    id: '1',
    profileId: 'user1',
    userName: 'Sarah Chen',
    userAvatar: '',
    rating: 5,
    comment: 'Amazing coffee and perfect atmosphere for working! The WiFi is super fast and the staff is friendly.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    helpful: 12,
    tags: ['☕ Good Coffee', '📶 Good WiFi', '🪑 Comfortable']
  },
  {
    id: '2', 
    profileId: 'user2',
    userName: 'Mike Rodriguez',
    userAvatar: '',
    rating: 4,
    comment: 'Great spot for meetings. Good food options and not too noisy.',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    helpful: 8,
    tags: ['🍕 Great Food', '👥 Social Vibe']
  }
];

export function VenueReviewSystem({ 
  venueId, 
  venueName, 
  userReview, 
  onReviewSubmit 
}: VenueReviewSystemProps) {
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviews] = useState<Review[]>(mockReviews);
  const { toast } = useToast();

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleSubmitReview = () => {
    if (comment.trim().length < 10) {
      toast({
        title: "Review too short",
        description: "Please write at least 10 characters.",
        variant: "destructive"
      });
      return;
    }

    onReviewSubmit?.(rating, comment.trim(), selectedTags);
    
    toast({
      title: "Review submitted! ⭐",
      description: "Thank you for sharing your experience."
    });

    setIsWritingReview(false);
    setComment('');
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const renderStars = (count: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onChange?.(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-all`}
          >
            <Star
              className={`w-4 h-4 ${
                star <= count
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Reviews for {venueName}</span>
            <div className="flex items-center gap-2">
              {renderStars(Math.round(averageRating))}
              <span className="text-sm text-muted-foreground">
                {averageRating.toFixed(1)} ({reviews.length} reviews)
              </span>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Write Review */}
      {!userReview && (
        <Card>
          <CardContent className="p-4">
            {!isWritingReview ? (
              <Button 
                onClick={() => setIsWritingReview(true)}
                className="w-full"
                variant="outline"
              >
                <Star className="w-4 h-4 mr-2" />
                Write a Review
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rating</label>
                  {renderStars(rating, true, setRating)}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    What describes this place? (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {reviewTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Review</label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmitReview}
                    className="flex-1"
                  >
                    Submit Review
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsWritingReview(false);
                      setComment('');
                      setSelectedTags([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <AnimatePresence>
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.userAvatar} />
                      <AvatarFallback>
                        {review.userName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{review.userName}</h4>
                        {renderStars(review.rating)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {review.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {review.comment}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <ThumbsUp className="w-3 h-3" />
                          Helpful ({review.helpful})
                        </button>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <MessageCircle className="w-3 h-3" />
                          Reply
                        </button>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <Share2 className="w-3 h-3" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}