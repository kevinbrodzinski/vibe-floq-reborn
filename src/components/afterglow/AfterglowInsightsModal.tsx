import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyInsightsTab from '@/components/afterglow/DailyInsightsTab';
import WeeklyTrendsTab from '@/components/afterglow/WeeklyTrendsTab';

interface AfterglowInsightsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  afterglowId?: string;
}

export default function AfterglowInsightsModal({ 
  open, 
  onOpenChange, 
  afterglowId 
}: AfterglowInsightsModalProps) {
  const [tab, setTab] = useState('weekly');

  // Close dialog on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogTitle>Insights</DialogTitle>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">7-day Trends</TabsTrigger>
            <TabsTrigger value="daily" disabled={!afterglowId}>Daily AI</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <WeeklyTrendsTab />
          </TabsContent>
          
          <TabsContent value="daily">
            {afterglowId ? (
              <DailyInsightsTab id={afterglowId} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No afterglow data available for AI insights.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}