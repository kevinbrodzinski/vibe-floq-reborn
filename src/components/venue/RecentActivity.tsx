import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RecentActivityProps {
  posts: Array<{
    text_content: string;
    vibe: string;
    profiles: {
      display_name?: string;
      username: string;
    };
  }>;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ posts }) => {
  if (!posts.length) return null;

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        Recent Posts
      </h3>
      <div className="space-y-3">
        {posts.slice(0, 3).map((post, idx) => (
          <div key={idx} className="text-sm p-3 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">{post.text_content}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{post.profiles.display_name || post.profiles.username}</span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">{post.vibe}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};