import { Suspense } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVenuePeople } from "@/hooks/useVenuePeople";
import { vibeEmoji } from "@/utils/vibe";

interface VenuePeopleTabProps {
  venueId: string;
}

function VenuePeopleContent({ venueId }: VenuePeopleTabProps) {
  const { data: people, isLoading, error, refetch } = useVenuePeople(venueId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card/30 animate-pulse">
            <div className="w-10 h-10 bg-muted/50 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-muted/50 rounded mb-2" />
              <div className="h-3 bg-muted/50 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !people) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Couldn't load people data</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Handle large crowds with virtualization
  const displayPeople = people.slice(0, 20);
  const overflowCount = Math.max(0, people.length - 20);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Who's Here Now</h3>
        <Badge variant="secondary">{people.length} people</Badge>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {displayPeople.map((person) => (
          <motion.div
            key={person.user_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={person.profiles.avatar_url} />
                <AvatarFallback>
                  {person.profiles.display_name?.charAt(0) || person.profiles.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{person.profiles.display_name || person.profiles.username}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-lg">{vibeEmoji(person.vibe)}</span>
                  <span>{person.session_duration}</span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="ghost" aria-label="Connect with user">
              <UserPlus className="w-4 h-4" />
            </Button>
          </motion.div>
        ))}
        
        {overflowCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-3 text-muted-foreground text-sm border-t border-border/50"
          >
            +{overflowCount} more people here
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export { VenuePeopleTab } from './VenuePeopleTabOptimized';

// Legacy export for backwards compatibility
export function VenuePeopleTabOld({ venueId }: VenuePeopleTabProps) {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card/30 animate-pulse">
            <div className="w-10 h-10 bg-muted/50 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-muted/50 rounded mb-2" />
              <div className="h-3 bg-muted/50 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    }>
      <VenuePeopleContent venueId={venueId} />
    </Suspense>
  );
}