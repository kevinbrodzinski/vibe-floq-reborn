-- ========== ENHANCED COLLABORATIVE PLANS SCHEMA ==========

-- ---------- Enhanced floq_plans table ------------------------------------------
ALTER TABLE public.floq_plans 
ADD COLUMN IF NOT EXISTS budget_per_person numeric(10,2),
ADD COLUMN IF NOT EXISTS total_budget numeric(10,2),
ADD COLUMN IF NOT EXISTS vibe_tags text[],
ADD COLUMN IF NOT EXISTS collaboration_status text DEFAULT 'draft'
  CHECK (collaboration_status IN ('draft', 'voting', 'finalized', 'active', 'completed', 'cancelled'));

-- ---------- Enhanced plan_participants table ------------------------------------
ALTER TABLE public.plan_participants
ADD COLUMN IF NOT EXISTS rsvp_status text DEFAULT 'pending'
  CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'maybe')),
ADD COLUMN IF NOT EXISTS invite_type text DEFAULT 'floq_member'
  CHECK (invite_type IN ('floq_member', 'external_friend', 'creator')),
ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

-- ---------- plan_stops table ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  estimated_cost_per_person numeric(8,2),
  stop_order integer NOT NULL,
  location geometry(Point, 4326),
  address text,
  stop_type text DEFAULT 'venue'
    CHECK (stop_type IN ('venue', 'activity', 'transport', 'break')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_id ON public.plan_stops(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_stops_order ON public.plan_stops(plan_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_plan_stops_venue ON public.plan_stops(venue_id);

-- ---------- plan_votes table ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('love', 'like', 'neutral', 'dislike', 'veto')),
  emoji_reaction text,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(stop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_votes_stop ON public.plan_votes(stop_id);
CREATE INDEX IF NOT EXISTS idx_plan_votes_user ON public.plan_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_votes_plan ON public.plan_votes(plan_id);

-- ---------- plan_comments table ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  stop_id uuid REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 2000),
  mentioned_users uuid[],
  reply_to_id uuid REFERENCES public.plan_comments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_comments_plan ON public.plan_comments(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_comments_stop ON public.plan_comments(stop_id);
CREATE INDEX IF NOT EXISTS idx_plan_comments_user ON public.plan_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_comments_reply ON public.plan_comments(reply_to_id);

-- ---------- plan_activities table -------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'created', 'stop_added', 'stop_removed', 'stop_updated',
    'vote_cast', 'comment_added', 'participant_joined',
    'participant_left', 'plan_finalized', 'plan_started', 'plan_completed')),
  entity_id uuid,
  entity_type text CHECK (entity_type IN ('stop', 'comment', 'vote', 'participant')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_activities_plan ON public.plan_activities(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_activities_user ON public.plan_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_activities_type ON public.plan_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_plan_activities_time ON public.plan_activities(created_at DESC);

-- ---------- plan_invitations table ------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text,
  invitee_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_type text DEFAULT 'external'
    CHECK (invitation_type IN ('external', 'floq_member')),
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_plan_invitations_plan ON public.plan_invitations(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_invitations_invitee_email ON public.plan_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_plan_invitations_invitee_user ON public.plan_invitations(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_plan_invitations_token ON public.plan_invitations(token);

-- ---------- Enable RLS ------------------------------------------------------
ALTER TABLE public.plan_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_invitations ENABLE ROW LEVEL SECURITY;

-- ---------- RLS Access Helper -----------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_plan_access(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plan_participants pp
    WHERE pp.plan_id = p_plan_id AND pp.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = p_plan_id AND fpar.user_id = auth.uid()
  );
$$;

-- ---------- RLS Policies ----------------------------------------------------

-- plan_stops
CREATE POLICY plan_stops_participants_read ON public.plan_stops
  FOR SELECT USING (public.user_has_plan_access(plan_id));

CREATE POLICY plan_stops_participants_write ON public.plan_stops
  FOR ALL USING (public.user_has_plan_access(plan_id))
  WITH CHECK (created_by = auth.uid() AND public.user_has_plan_access(plan_id));

-- plan_votes
CREATE POLICY plan_votes_participants_read ON public.plan_votes
  FOR SELECT USING (public.user_has_plan_access(plan_id));

CREATE POLICY plan_votes_own_vote ON public.plan_votes
  FOR ALL USING (user_id = auth.uid() AND public.user_has_plan_access(plan_id))
  WITH CHECK (user_id = auth.uid() AND public.user_has_plan_access(plan_id));

-- plan_comments
CREATE POLICY plan_comments_participants_read ON public.plan_comments
  FOR SELECT USING (public.user_has_plan_access(plan_id));

CREATE POLICY plan_comments_participants_write ON public.plan_comments
  FOR ALL USING (user_id = auth.uid() AND public.user_has_plan_access(plan_id))
  WITH CHECK (user_id = auth.uid() AND public.user_has_plan_access(plan_id));

-- plan_activities
CREATE POLICY plan_activities_participants_read ON public.plan_activities
  FOR SELECT USING (public.user_has_plan_access(plan_id));

CREATE POLICY plan_activities_system_write ON public.plan_activities
  FOR INSERT WITH CHECK (user_id = auth.uid() AND public.user_has_plan_access(plan_id));

-- plan_invitations
CREATE POLICY plan_invitations_creator_manage ON public.plan_invitations
  FOR ALL USING (
    inviter_id = auth.uid()
    OR invitee_user_id = auth.uid()
    OR public.user_has_plan_access(plan_id)
  )
  WITH CHECK (inviter_id = auth.uid() AND public.user_has_plan_access(plan_id));

-- ---------- updated_at Triggers ---------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_stops_updated_at
  BEFORE UPDATE ON public.plan_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_votes_updated_at
  BEFORE UPDATE ON public.plan_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_comments_updated_at
  BEFORE UPDATE ON public.plan_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Activity Logging Triggers ---------------------------------------
CREATE OR REPLACE FUNCTION public.log_plan_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'plan_stops' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.plan_activities (plan_id, user_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.created_by, 'stop_added', NEW.id, 'stop',
              jsonb_build_object('title', NEW.title, 'stop_order', NEW.stop_order));
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO public.plan_activities (plan_id, user_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, auth.uid(), 'stop_updated', NEW.id, 'stop',
              jsonb_build_object('title', NEW.title));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.plan_activities (plan_id, user_id, activity_type, entity_id, entity_type, metadata)
      VALUES (OLD.plan_id, auth.uid(), 'stop_removed', OLD.id, 'stop',
              jsonb_build_object('title', OLD.title));
    END IF;
  ELSIF TG_TABLE_NAME = 'plan_votes' THEN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      INSERT INTO public.plan_activities (plan_id, user_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.user_id, 'vote_cast', NEW.id, 'vote',
              jsonb_build_object('vote_type', NEW.vote_type, 'emoji_reaction', NEW.emoji_reaction));
    END IF;
  ELSIF TG_TABLE_NAME = 'plan_comments' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.plan_activities (plan_id, user_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.user_id, 'comment_added', NEW.id, 'comment',
              jsonb_build_object('content_preview', LEFT(NEW.content, 50)));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_plan_stops_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.plan_stops
  FOR EACH ROW EXECUTE FUNCTION public.log_plan_activity();

CREATE TRIGGER log_plan_votes_activity
  AFTER INSERT OR UPDATE ON public.plan_votes
  FOR EACH ROW EXECUTE FUNCTION public.log_plan_activity();

CREATE TRIGGER log_plan_comments_activity
  AFTER INSERT ON public.plan_comments
  FOR EACH ROW EXECUTE FUNCTION public.log_plan_activity();