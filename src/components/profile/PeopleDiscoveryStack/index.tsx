import React from 'react';
import { VibeMeter } from './VibeMeter';
import { BreakdownStrip } from './BreakdownStrip';
import { CloseEncounters } from './CloseEncounters';
import { CommonInterests } from './CommonInterests';
import { CommonVenues } from './CommonVenues';
import { FloqSuggestion } from './FloqSuggestion';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface PeopleDiscoveryStackProps {
  targetId: string;
  className?: string;
}

export const PeopleDiscoveryStack: React.FC<PeopleDiscoveryStackProps> = ({ 
  targetId, 
  className = '' 
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className={`space-y-4 min-h-[400px] ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="p-4 bg-surface/10 border-border/20 backdrop-blur-sm">
        <motion.div 
          variants={itemVariants}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <h3 className="text-sm font-medium text-foreground mb-3">
            Compatibility Overview
          </h3>
          <div className="flex items-center gap-4">
            <VibeMeter targetId={targetId} />
            <BreakdownStrip targetId={targetId} />
          </div>
        </motion.div>
      </Card>

      <motion.div 
        variants={itemVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <CloseEncounters targetId={targetId} />
      </motion.div>

      <motion.div 
        variants={itemVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <CommonInterests targetId={targetId} />
      </motion.div>

      <motion.div 
        variants={itemVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <CommonVenues targetId={targetId} />
      </motion.div>

      <motion.div 
        variants={itemVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <FloqSuggestion targetId={targetId} />
      </motion.div>
    </motion.div>
  );
};