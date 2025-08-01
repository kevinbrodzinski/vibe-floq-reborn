import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSuggestedActions } from '@/hooks/useSuggestedActions';
import { cn } from '@/lib/utils';

interface Props { className?: string }

export const SuggestedAlignmentActions: React.FC<Props> = ({ className }) => {
  const { actions } = useSuggestedActions();
  if (!actions.length) return null;

  return (
    <div className={cn('px-4 space-y-4', className)}>
      {actions.map((a) => (
        <motion.div
          key={a.id}
          layout
          initial={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{a.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3 text-muted-foreground">{a.subtitle}</p>
              <Button 
                variant={a.primary ? 'secondary' : 'outline'}
                onClick={() => {
                  // TODO: Add navigation logic based on action type
                  console.log(`Action pressed: ${a.id}`);
                }}
              >
                {a.cta}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};