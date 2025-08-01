import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSuggestedActions } from '@/hooks/useSuggestedActions';
import { ReasoningCard } from '@/components/social/ReasoningCard';
import { cn } from '@/lib/utils';

interface Props { className?: string }

export const SuggestedAlignmentActions: React.FC<Props> = ({ className }) => {
  const { actions } = useSuggestedActions();
  
  const handleActionClick = (actionId: string) => {
    console.log(`Action pressed: ${actionId}`);
    // TODO: Add navigation logic based on action type
    // venues -> navigate to Pulse
    // floq -> send join request
  };

  if (!actions.length) return null;

  return (
    <div className={cn('px-4 space-y-4', className)}>
      {actions.map((action) => (
        <motion.div
          key={action.id}
          layout
          initial={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{action.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{action.subtitle}</p>
              
              <Button 
                variant={action.primary ? 'secondary' : 'outline'}
                className="w-full"
                onClick={() => handleActionClick(action.id)}
              >
                {action.cta}
              </Button>

              <ReasoningCard 
                reasoning={action.reasoning}
                vibeBreakdown={action.vibeBreakdown}
                realTimeFactors={action.realTimeFactors}
              />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};