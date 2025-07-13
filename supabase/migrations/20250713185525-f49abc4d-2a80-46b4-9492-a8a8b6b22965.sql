-- Enhanced chat and invitations migration with ENUM and constraints
-- floq_messages and floq_invitations tables with optimized RLS

-- Create invitation status enum
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined');

-- Create floq_messages table
CREATE TABLE public.floq_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id uuid REFERENCES public.floqs(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body text,
  emoji text,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure at least one of body or emoji is provided
  CONSTRAINT message_has_content CHECK (
    (body IS NOT NULL AND trim(body) != '') OR 
    (emoji IS NOT NULL AND trim(emoji) != '')
  )
);

-- Create floq_invitations table
CREATE TABLE public.floq_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id uuid REFERENCES public.floqs(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status invitation_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  responded_at timestamptz,
  
  -- Prevent duplicate pending invitations
  CONSTRAINT unique_pending_invitation UNIQUE (floq_id, invitee_id) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS
ALTER TABLE public.floq_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floq_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for floq_messages
CREATE POLICY "Floq members can read messages" ON public.floq_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.floq_participants fp 
      WHERE fp.floq_id = floq_messages.floq_id 
      AND fp.user_id = auth.uid()
    )
  );

CREATE POLICY "Floq members can send messages" ON public.floq_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.floq_participants fp 
      WHERE fp.floq_id = floq_messages.floq_id 
      AND fp.user_id = auth.uid()
    )
  );

CREATE POLICY "Senders can delete their own messages" ON public.floq_messages
  FOR DELETE USING (sender_id = auth.uid());

-- RLS Policies for floq_invitations
CREATE POLICY "Users can view invitations involving them" ON public.floq_invitations
  FOR SELECT USING (
    inviter_id = auth.uid() OR 
    invitee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.floqs f 
      WHERE f.id = floq_invitations.floq_id 
      AND f.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can send invitations to their floqs" ON public.floq_invitations
  FOR INSERT WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.floq_participants fp 
      WHERE fp.floq_id = floq_invitations.floq_id 
      AND fp.user_id = auth.uid()
    )
  );

CREATE POLICY "Invitees can respond to invitations" ON public.floq_invitations
  FOR UPDATE USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

CREATE POLICY "Inviters can cancel pending invitations" ON public.floq_invitations
  FOR DELETE USING (
    inviter_id = auth.uid() AND status = 'pending'
  );

-- Optimized indexes for performance
CREATE INDEX idx_floq_messages_floq_timeline ON public.floq_messages(floq_id, created_at DESC);
CREATE INDEX idx_floq_messages_sender ON public.floq_messages(sender_id);

CREATE INDEX idx_floq_invitations_floq ON public.floq_invitations(floq_id);
CREATE INDEX idx_floq_invitations_invitee_pending ON public.floq_invitations(invitee_id, status) 
  WHERE status = 'pending';
CREATE INDEX idx_floq_invitations_inviter ON public.floq_invitations(inviter_id);

-- Enable realtime for both tables
ALTER TABLE public.floq_messages REPLICA IDENTITY FULL;
ALTER TABLE public.floq_invitations REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_invitations;