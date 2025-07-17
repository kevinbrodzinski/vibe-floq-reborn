import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRecentAfterglows } from '@/hooks/useRecentAfterglows';
import { Badge } from '@/components/ui/badge';

export type AfterglowCalendarDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function AfterglowCalendarDialog({ open, onOpenChange }: AfterglowCalendarDialogProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, isLoading } = useRecentAfterglows();

  const onSelect = (d: Date | undefined) => {
    if (!d) return;
    
    const newParams = new URLSearchParams(params);
    newParams.set('date', d.toISOString().slice(0, 10));
    navigate({ search: newParams.toString() });
    onOpenChange(false);
  };

  const currentDate = params.get('date') ? new Date(params.get('date')!) : new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Select a day</DialogTitle>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {!isLoading && (
          <>
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={onSelect}
              modifiers={{ hasData: data?.hasDataDates || [] }}
              modifiersClassNames={{ hasData: 'font-bold text-primary' }}
              className="pointer-events-auto"
            />

            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Last 7 days</p>
              <div className="flex flex-wrap gap-2">
                {data?.recent.map(d => (
                  <Badge
                    key={d.date}
                    onClick={() => onSelect(new Date(d.date))}
                    variant={d.has_data ? 'secondary' : 'outline'}
                    className="cursor-pointer hover:opacity-80"
                  >
                    {d.date.slice(5)} • {d.energy ?? '—'}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}