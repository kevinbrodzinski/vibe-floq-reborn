import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { publishPresence } from '@/lib/presence/publishPresence';

/**
 * Quick test button to publish presence and verify data flow
 */
export const TestPresenceButton: React.FC = () => {
  const [isPublishing, setIsPublishing] = useState(false);

  const testPublish = async () => {
    setIsPublishing(true);
    try {
      // Publish test presence near LA downtown
      await publishPresence(
        34.0522 + (Math.random() - 0.5) * 0.01, // Add some jitter
        -118.2437 + (Math.random() - 0.5) * 0.01,
        ['social', 'hype', 'chill', 'flowing'][Math.floor(Math.random() * 4)] as any,
        'public'
      );
      
      console.log('[TestPresence] Published test presence successfully');
    } catch (error) {
      console.error('[TestPresence] Failed to publish:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Button 
      onClick={testPublish} 
      disabled={isPublishing}
      size="sm"
      className="flex items-center gap-2"
    >
      <MapPin className="w-4 h-4" />
      {isPublishing ? 'Publishing...' : 'Test Presence'}
    </Button>
  );
};