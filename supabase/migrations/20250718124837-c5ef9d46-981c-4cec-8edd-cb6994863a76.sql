-- Fix RLS policies for crossed paths functionality

--------------------------------------------------------------------
-- 1️⃣  Make sure the user can read her own "crossed paths" rows
--------------------------------------------------------------------
alter table encounters_today enable row level security;

drop policy if exists crossed_paths_read on encounters_today;
create policy crossed_paths_read
on encounters_today
for select
using (user_id = auth.uid());        -- each user only sees her rows

--------------------------------------------------------------------
-- 2️⃣  If you aggregate in the RPC, let it see the raw encounters
--------------------------------------------------------------------
alter table friend_encounters enable row level security;

drop policy if exists encounters_read on friend_encounters;
create policy encounters_read
on friend_encounters
for select
using (
      user_id = auth.uid()           -- I initiated the encounter
   or friend_id = auth.uid()         -- …or I'm on the other side
);