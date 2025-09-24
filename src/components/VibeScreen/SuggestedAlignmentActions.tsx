import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSuggestedActions } from '@/hooks/useSuggestedActions';
import { ReasoningCard } from '@/components/social/ReasoningCard';
import { cn } from '@/lib/utils';

interface Props { className?: string }

export const SuggestedAlignmentActions: React.FC<Props> = ({ className }) => {
  // Component disabled - venue/floq suggestions moved to expandable buttons
  return null;
};