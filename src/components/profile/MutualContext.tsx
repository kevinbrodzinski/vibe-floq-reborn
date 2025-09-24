import { GlassCard } from './GlassCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAvatarUrl, getInitials } from '@/lib/avatar';

interface MutualContextProps {
  friendId: string;
}

const mockMutualData = {
  mutualFriends: [
    { id: '1', username: 'alice', display_name: 'Alice Chen', avatar_url: null },
    { id: '2', username: 'bob', display_name: 'Bob Wilson', avatar_url: null },
    { id: '3', username: 'carol', display_name: 'Carol Davis', avatar_url: null },
    { id: '4', username: 'dave', display_name: 'Dave Miller', avatar_url: null },
    { id: '5', username: 'eve', display_name: 'Eve Johnson', avatar_url: null },
    { id: '6', username: 'frank', display_name: 'Frank Brown', avatar_url: null },
  ],
  mutualFloqs: [
    { id: '1', title: 'Coffee & Code', status: 'active', participants: 4 },
    { id: '2', title: 'Sunset Walk', status: 'completed', participants: 2 },
  ],
  mutualPlans: [
    { id: '1', title: 'Weekend Brunch', status: 'confirmed', date: 'This weekend' },
    { id: '2', title: 'Movie Night', status: 'pending', date: 'Next week' },
  ],
};

export const MutualContext = ({ friendId }: MutualContextProps) => {
  return (
    <GlassCard>
      <h3 className="text-lg font-light text-white mb-4">Mutual Context</h3>
      
      <div className="space-y-4">
        {/* Mutual Friends */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Mutual Friends</span>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-white">
              See all
            </Button>
          </div>
          <div className="flex -space-x-2">
            {mockMutualData.mutualFriends.slice(0, 6).map((friend) => (
              <Avatar key={friend.id} className="w-8 h-8 border border-white/20">
                <AvatarImage src={getAvatarUrl(friend.avatar_url, 32)} />
                <AvatarFallback className="text-xs">
                  {getInitials(friend.display_name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {mockMutualData.mutualFriends.length > 6 && (
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  +{mockMutualData.mutualFriends.length - 6}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mutual Floqs */}
        <div>
          <span className="text-sm font-medium text-white mb-2 block">Mutual Floqs</span>
          <div className="space-y-2">
            {mockMutualData.mutualFloqs.map((floq) => (
              <div key={floq.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm text-white">{floq.title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-white/20 text-muted-foreground">
                    {floq.participants} people
                  </Badge>
                  <Badge className={
                    floq.status === 'active' 
                      ? 'bg-green-500/20 text-green-300 border-green-500/40'
                      : 'bg-gray-500/20 text-gray-300 border-gray-500/40'
                  }>
                    {floq.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mutual Plans */}
        <div>
          <span className="text-sm font-medium text-white mb-2 block">Mutual Plans</span>
          <div className="space-y-2">
            {mockMutualData.mutualPlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <span className="text-sm text-white block">{plan.title}</span>
                  <span className="text-xs text-muted-foreground">{plan.date}</span>
                </div>
                <Badge className={
                  plan.status === 'confirmed' 
                    ? 'bg-green-500/20 text-green-300 border-green-500/40'
                    : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                }>
                  {plan.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};