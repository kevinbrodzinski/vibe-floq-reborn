import { Suspense, memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVenuePeople } from "@/hooks/useVenuePeople";
import { vibeEmoji } from "@/utils/vibe";
import { FixedSizeList as List } from 'react-window';
import isEqual from 'react-fast-compare';

interface VenuePeopleTabProps {
  venueId: string;
}

interface PersonItemProps {
  index: number;
  style: any;
  data: any[];
}

// Memoized person item component for virtualization
const PersonItem = memo(({ index, style, data }: PersonItemProps) => {
  const person = data[index];
  
  return (
    <div style={style}>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between p-3 mx-6 mb-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
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
    </div>
  );
}, isEqual);

PersonItem.displayName = 'PersonItem';

// Memoized content component with optimized renders
const VenuePeopleContentMemoized = memo(({ venueId }: VenuePeopleTabProps) => {
  const { data: people, isLoading, error, refetch } = useVenuePeople(venueId);

  // Memoize loading skeleton to prevent re-renders
  const loadingSkeleton = useMemo(() => (
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
  ), []);

  // Memoize error state to prevent re-renders
  const errorState = useMemo(() => (
    <div className="p-6 text-center space-y-4">
      <div className="text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Couldn't load people data</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => refetch()}>
        Try Again
      </Button>
    </div>
  ), [refetch]);

  // Memoize people data processing with shallow comparison
  const { displayPeople, overflowCount, peopleCount } = useMemo(() => {
    if (!people) return { displayPeople: [], overflowCount: 0, peopleCount: 0 };
    
    return {
      displayPeople: people.slice(0, 20),
      overflowCount: Math.max(0, people.length - 20),
      peopleCount: people.length
    };
  }, [people]);

  if (isLoading) return loadingSkeleton;
  if (error || !people) return errorState;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Who's Here Now</h3>
        <Badge variant="secondary">{peopleCount} people</Badge>
      </div>

      {/* Virtualized list for better performance */}
      <div className="max-h-[400px] overflow-hidden">
        {displayPeople.length > 0 ? (
          <List
            height={Math.min(400, displayPeople.length * 82)} // 82px per item (padding + content)
            width="100%"
            itemCount={displayPeople.length}
            itemSize={82}
            itemData={displayPeople}
            className="touch-action-pan-y"
          >
            {PersonItem}
          </List>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No one here right now</p>
          </div>
        )}
        
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
}, isEqual);

VenuePeopleContentMemoized.displayName = 'VenuePeopleContentMemoized';

export function VenuePeopleTab({ venueId }: VenuePeopleTabProps) {
  const fallback = useMemo(() => (
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
  ), []);

  return (
    <Suspense fallback={fallback}>
      <VenuePeopleContentMemoized venueId={venueId} />
    </Suspense>
  );
}