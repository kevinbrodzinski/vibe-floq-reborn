import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { createFloqRally } from '@/lib/api/rally';
import { MapPin, Users, Clock } from 'lucide-react';

interface FloqRallyModalProps {
  isOpen: boolean;
  onClose: () => void;
  floqId: string;
  floqName: string;
}

export function FloqRallyModal({ isOpen, onClose, floqId, floqName }: FloqRallyModalProps) {
  const [note, setNote] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreateRally = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const map = getCurrentMap();
      const center = map?.getCenter?.();
      
      if (!center) {
        throw new Error('Unable to get current location');
      }
      
      const { rallyId, invited } = await createFloqRally({
        floqId,
        center: { lng: center.lng, lat: center.lat },
        ttlMin: 60,
        note: note || `Rally for ${floqName}!`
      });
      
      toast({
        title: 'Rally Started!',
        description: `Notified ${invited} floq members`,
      });
      
      // Invalidate queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["floqs-cards"] }),
        queryClient.invalidateQueries({ queryKey: ["hq-digest", floqId] }),
        queryClient.invalidateQueries({ queryKey: ["hq-vibes", floqId] }),
        queryClient.invalidateQueries({ queryKey: ["hq-availability", floqId] }),
        queryClient.invalidateQueries({ queryKey: ["floq-stream", floqId] }),
      ]);
      
      // Reset and close
      setNote('');
      onClose();
      
    } catch (error: any) {
      toast({
        title: 'Failed to create rally',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rally {floqName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
              <MapPin className="h-4 w-4" />
              <span>Rally location: Current map center</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Clock className="h-4 w-4" />
              <span>Duration: 60 minutes</span>
            </div>
          </div>
          
          <div>
            <label htmlFor="rally-note" className="block text-sm font-medium text-white/80 mb-2">
              Message (optional)
            </label>
            <Textarea
              id="rally-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Coffee in 30? 🫶"
              className="glass border-white/20 text-white placeholder:text-white/50"
              maxLength={100}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-white/20 text-white/80"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRally}
              disabled={isCreating}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isCreating ? 'Starting...' : 'Start Rally'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}