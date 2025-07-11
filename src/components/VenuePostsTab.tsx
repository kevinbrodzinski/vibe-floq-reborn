import { Suspense } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVenuePosts } from "@/hooks/useVenuePosts";
import { vibeEmoji } from "@/utils/vibe";

interface VenuePostsTabProps {
  venueId: string;
}

function VenuePostsContent({ venueId }: VenuePostsTabProps) {
  const { data: posts, isLoading, error } = useVenuePosts(venueId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-card/30 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-muted/50 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-muted/50 rounded mb-2" />
                <div className="h-3 bg-muted/50 rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted/50 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !posts) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Unable to load posts
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Recent Activity</h3>
        <Badge variant="secondary">{posts.length} posts</Badge>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {posts.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-card/50 border border-border/50"
          >
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.profiles.avatar_url} />
                <AvatarFallback className="text-xs">
                  {post.profiles.display_name?.charAt(0) || post.profiles.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{post.profiles.display_name || post.profiles.username}</p>
                  <span className="text-lg">{vibeEmoji(post.vibe)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleTimeString()}
                  </span>
                </div>
                {post.text_content && (
                  <p className="text-sm text-muted-foreground mb-2">{post.text_content}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{post.reaction_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{post.view_count || 0} views</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function VenuePostsTab({ venueId }: VenuePostsTabProps) {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-card/30 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-muted/50 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-muted/50 rounded mb-2" />
                <div className="h-3 bg-muted/50 rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted/50 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    }>
      <VenuePostsContent venueId={venueId} />
    </Suspense>
  );
}