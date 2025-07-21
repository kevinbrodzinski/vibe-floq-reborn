
import React from 'react';
import { FloqChatPanel } from '@/components/FloqChatPanel';
import { Card } from '@/components/ui/card';

interface FloqChatProps {
  floqId: string;
  isOpen: boolean;
  onClose: () => void;
  isJoined: boolean;
}

export const FloqChat: React.FC<FloqChatProps> = ({
  floqId,
  isOpen,
  onClose,
  isJoined,
}) => {
  if (!isJoined) return null;

  return (
    <Card className="h-[500px] flex flex-col">
      <FloqChatPanel floqId={floqId} />
    </Card>
  );
};
