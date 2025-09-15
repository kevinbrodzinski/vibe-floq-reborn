import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useVenueSelection } from '@/hooks/useVenueSelection';
import { Button } from '@/components/ui/button';

export function VenueInfoCard() {
  const { selected, clear } = useVenueSelection();
  
  if (!selected) return null;

  return (
    <Sheet open={!!selected} onOpenChange={(open) => !open && clear()}>
      <SheetContent side="bottom" className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="font-medium">{selected.name ?? 'Venue'}</div>
            <div className="text-xs text-muted-foreground">
              {selected.properties?.category ?? 'Place'}
            </div>
          </div>
          {selected.color && (
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: selected.color }} 
            />
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => {
              if (selected.lngLat) {
                window.dispatchEvent(new CustomEvent('floq:navigate', { 
                  detail: { to: selected.lngLat } 
                }));
              }
            }}
          >
            Navigate
          </Button>
          <Button size="sm" variant="ghost" onClick={clear}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}