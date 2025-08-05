import React from 'react';
import { Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface IntelBlockProps {
  intel: {
    socialTexture?: { moodDescription: string };
    dominantVibe?: string;
  };
}

export const IntelBlock: React.FC<IntelBlockProps> = ({ intel }) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        Live Intelligence
      </h3>
      <div className="space-y-3 text-sm">
        {intel.socialTexture && (
          <div>
            <span className="font-medium">Social Energy:</span>{' '}
            <span className="text-muted-foreground">{intel.socialTexture.moodDescription}</span>
          </div>
        )}
        {intel.dominantVibe && (
          <div>
            <span className="font-medium">Dominant Vibe:</span>{' '}
            <span className="text-muted-foreground">{intel.dominantVibe}</span>
          </div>
        )}
      </div>
    </Card>
  );
};