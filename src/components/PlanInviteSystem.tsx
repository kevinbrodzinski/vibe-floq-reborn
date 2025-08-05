import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Copy, Check, Mail, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlanInviteSystemProps {
  planId: string;
  isHost?: boolean;
}

export function PlanInviteSystem({ planId, isHost = false }: PlanInviteSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareLink = `${window.location.origin}/plan/${planId}`;

  const inviteByUsername = async () => {
    if (!usernameInput.trim()) return;

    setIsInviting(true);
    try {
      // Find user by username
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', usernameInput.trim())
        .single();

      if (userError || !user) {
        toast({
          title: "User not found",
          description: `No user found with username "${usernameInput}"`,
          variant: "destructive"
        });
        return;
      }

      // Add to plan participants
      const { error: inviteError } = await supabase
        .from('plan_participants')
        .insert({
          plan_id: planId,
          profile_id: user.id,
          invite_type: 'username'
        });

      if (inviteError) {
        if (inviteError.code === '23505') { // Unique constraint violation
          toast({
            title: "Already invited",
            description: "This user is already part of the plan",
            variant: "destructive"
          });
        } else {
          throw inviteError;
        }
        return;
      }

      toast({
        title: "Invitation sent",
        description: `${usernameInput} has been added to the plan`,
      });

      setUsernameInput('');
    } catch (error) {
      console.error('Invite error:', error);
      toast({
        title: "Invitation failed",
        description: "Unable to send invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const inviteByEmail = async () => {
    if (!emailInput.trim()) return;

    setIsInviting(true);
    try {
      const { error } = await supabase
        .from('plan_invitations')
        .insert({
          plan_id: planId,
          inviter_id: (await supabase.auth.getUser()).data.user?.id,
          invitee_email: emailInput.trim(),
          invitation_type: 'email'
        });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${emailInput}`,
      });

      setEmailInput('');
    } catch (error) {
      console.error('Email invite error:', error);
      toast({
        title: "Invitation failed",
        description: "Unable to send email invitation",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  if (!isHost) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={copyShareLink}
        className="flex items-center gap-2"
      >
        {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        Share Plan
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Friends
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Plan</DialogTitle>
          <DialogDescription>
            Invite friends to join your plan by username, email, or share a link.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Username invite */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Invite by Username</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inviteByUsername()}
              />
              <Button 
                onClick={inviteByUsername}
                disabled={!usernameInput.trim() || isInviting}
                size="sm"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Email invite */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Invite by Email</label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inviteByEmail()}
              />
              <Button 
                onClick={inviteByEmail}
                disabled={!emailInput.trim() || isInviting}
                size="sm"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Share link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="font-mono text-xs"
              />
              <Button 
                onClick={copyShareLink}
                variant="outline"
                size="sm"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Anyone with the link can join this plan
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}