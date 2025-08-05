import React from 'react';
import { FloqChatPanel } from '@/components/FloqChatPanel';
import { Card } from '@/components/ui/card';

interface FloqChatProps {
  floqId: string;
}

export const FloqChat: React.FC<FloqChatProps> = ({ floqId }) => {
  return (
    <Card className="h-[500px] flex flex-col">
      <FloqChatPanel floqId={floqId} />
    </Card>
  );
};