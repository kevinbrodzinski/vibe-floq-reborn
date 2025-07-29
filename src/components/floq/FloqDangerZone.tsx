import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, X, Archive, UserX, AlertTriangle, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDeleteFloq } from '@/hooks/useDeleteFloq';
import { toast } from 'sonner';
import type { FloqDetails } from '@/hooks/useFloqDetails';
import { useIsMobile } from '@/hooks/use-mobile';

interface FloqDangerZoneProps {
  floqDetails: FloqDetails;
  onEndFloq?: () => void;
  isEndingFloq?: boolean;
}

export const FloqDangerZone: React.FC<FloqDangerZoneProps> = ({ 
  floqDetails, 
  onEndFloq, 
  isEndingFloq = false 
}) => {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const isMobile = useIsMobile();
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: deleteFloq, isPending: isDeleting } = useDeleteFloq();

  // Get potential new owners (co-admins only)
  const potentialOwners = useMemo(() => 
    floqDetails.participants.filter(p => 
      p.role === 'co-admin' && p.profile_id !== floqDetails.creator_id
    ),
    [floqDetails.participants, floqDetails.creator_id]
  );

  // Check if floq can be deleted (solo or ended)
  const canDelete = useMemo(() => 
    floqDetails.participant_count === 1 || 
    (floqDetails.ends_at && new Date(floqDetails.ends_at) < new Date()),
    [floqDetails.participant_count, floqDetails.ends_at]
  );

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;
    
    setIsTransferring(true);
    try {
      // Update creator_id in floqs table
      const { error: floqError } = await supabase
        .from('floqs')
        .update({ creator_id: selectedNewOwner })
        .eq('id', floqDetails.id);

      if (floqError) throw floqError;

      // Update roles in participants table
      const { error: roleError } = await supabase
        .from('floq_participants')
        .update({ role: 'creator' })
        .eq('floq_id', floqDetails.id)
        .eq('profile_id', selectedNewOwner);

      if (roleError) throw roleError;

      // Update old creator to co-admin
      const { error: oldRoleError } = await supabase
        .from('floq_participants')
        .update({ role: 'co-admin' })
        .eq('floq_id', floqDetails.id)
        .eq('profile_id', floqDetails.creator_id);

      if (oldRoleError) throw oldRoleError;

      await queryClient.invalidateQueries({ queryKey: ['floq-details', floqDetails.id] });
      toast.success('Ownership transferred successfully');
      setShowTransferConfirm(false);
      setSelectedNewOwner('');
      
      // Navigate away since user is no longer the host
      navigate('/floqs');
    } catch (error) {
      console.error('Failed to transfer ownership:', error);
      toast.error('Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleArchiveFloq = async () => {
    setIsArchiving(true);
    try {
      const { error } = await supabase
        .from('floqs')
        .update({ 
          ends_at: new Date().toISOString(),
          flock_type: 'momentary'
        })
        .eq('id', floqDetails.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['floq-details', floqDetails.id] });
      toast.success('Floq archived successfully');
      setShowArchiveConfirm(false);
      navigate('/floqs');
    } catch (error) {
      console.error('Failed to archive floq:', error);
      toast.error('Failed to archive floq');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeleteFloq = async () => {
    try {
      await deleteFloq(floqDetails.id);
      setShowDeleteConfirm(false);
      navigate('/floqs');
    } catch (error) {
      // Error already handled in hook
    }
  };

  return (
    <div className="space-y-6">
      {/* End Floq Section */}
      {!floqDetails.ends_at && onEndFloq && (
        <Card className="p-4 border-orange-200 bg-orange-50/50">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-orange-600" />
              <h4 className="font-medium text-orange-800">End Persistent Floq</h4>
            </div>
            <p className="text-sm text-orange-700">
              End this ongoing floq. Members will still be able to access the chat history, 
              but no new members can join.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowEndConfirm(true)}
              disabled={isEndingFloq}
              className={`border-orange-300 text-orange-700 hover:bg-orange-100 ${
                isMobile ? "w-full h-12" : ""
              }`}
            >
              <X className="w-4 h-4 mr-2" />
              End Floq
            </Button>
          </div>
        </Card>
      )}

      {/* Archive Section */}
      <Card className="p-4 border-blue-200 bg-blue-50/50">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-blue-800">Archive Floq</h4>
          </div>
          <p className="text-sm text-blue-700">
            Archive this floq by setting an end time to now. Members can still view 
            chat history but the floq becomes inactive.
          </p>
          <Button
            variant="outline"
            onClick={() => setShowArchiveConfirm(true)}
            disabled={isArchiving}
            className={`border-blue-300 text-blue-700 hover:bg-blue-100 ${
              isMobile ? "w-full h-12" : ""
            }`}
          >
            <Archive className="w-4 h-4 mr-2" />
            Archive Floq
          </Button>
        </div>
      </Card>

      {/* Transfer Ownership Section */}
      {potentialOwners.length > 0 && (
        <Card className="p-4 border-purple-200 bg-purple-50/50">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-purple-800">Transfer Ownership</h4>
            </div>
            <p className="text-sm text-purple-700">
              Transfer ownership to another co-admin. You'll become a co-admin and they'll 
              become the new host with full management access.
            </p>
            
            <div className="space-y-2">
              <Label>Select new owner</Label>
              <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                <SelectTrigger className={isMobile ? "h-12" : ""}>
                  <SelectValue placeholder="Choose a co-admin" />
                </SelectTrigger>
                <SelectContent>
                  {potentialOwners.map((user) => (
                    <SelectItem key={user.profile_id} value={user.profile_id}>
                      {user.display_name} {user.username && `(@${user.username})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowTransferConfirm(true)}
              disabled={!selectedNewOwner || isTransferring}
              className={`border-purple-300 text-purple-700 hover:bg-purple-100 ${
                isMobile ? "w-full h-12" : ""
              }`}
            >
              <Crown className="w-4 h-4 mr-2" />
              Transfer Ownership
            </Button>
          </div>
        </Card>
      )}

      {/* Delete Section */}
      <Card className="p-4 border-destructive bg-destructive/5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h4 className="font-medium text-destructive">Danger Zone</h4>
          </div>
          
          <p className="text-sm text-destructive/80">
            Permanently delete this floq. This action cannot be undone. 
            All chat history and data will be lost.
          </p>
          
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block w-full" role="presentation">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={!canDelete || isDeleting}
                    aria-disabled={!canDelete || isDeleting}
                    className={`w-full h-12 ${!canDelete ? 'pointer-events-none hover:bg-destructive' : ''}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Floq
                  </Button>
                </span>
              </TooltipTrigger>
              {!canDelete && (
                <TooltipContent side="bottom">
                  Transfer ownership or remove members first
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="End this floq?"
        description="This will stop the floq from accepting new members, but existing members can still access the chat."
        confirmLabel="End Floq"
        cancelLabel="Cancel"
        isLoading={isEndingFloq}
        onConfirm={() => {
          onEndFloq?.();
          setShowEndConfirm(false);
        }}
      />

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive this floq?"
        description="This will set the floq's end time to now, making it inactive. Members can still view chat history."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        isLoading={isArchiving}
        onConfirm={handleArchiveFloq}
      />

      <ConfirmDialog
        open={showTransferConfirm}
        onOpenChange={setShowTransferConfirm}
        title="Transfer ownership?"
        description={`Are you sure you want to transfer ownership to ${potentialOwners.find(p => p.profile_id === selectedNewOwner)?.display_name}? You'll become a co-admin and lose host privileges.`}
        confirmLabel="Transfer"
        cancelLabel="Cancel"
        isLoading={isTransferring}
        onConfirm={handleTransferOwnership}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this floq?"
        description="This action is permanent. All chat history, members, and data will be lost forever."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleDeleteFloq}
      />
    </div>
  );
};