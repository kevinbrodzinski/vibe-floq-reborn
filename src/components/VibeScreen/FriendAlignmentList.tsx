import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFriendVibeMatches } from '@/hooks/useFriendVibeMatches';

export const FriendAlignmentList: React.FC = () => {
  const { data } = useFriendVibeMatches();
  if (!data.length) return null;

  return (
    <div className="px-4 space-y-4">
      {data.map((m) => (
        <motion.div
          key={m.id}
          layout
          initial={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full" />
              <CardTitle>{m.name} matches your vibe</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3 text-muted-foreground">
                Match {(m.match * 100).toFixed(0)}% · {m.location}
              </p>
              <Button variant="secondary" className="mr-2">Plan</Button>
              <Button variant="outline">Ping</Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};