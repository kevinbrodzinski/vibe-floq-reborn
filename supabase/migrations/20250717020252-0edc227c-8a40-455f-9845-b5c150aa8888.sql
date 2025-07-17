create policy "Allow HEAD probes"
  on public.plan_participants
  for head
  using (   -- same predicate
    plan_id in (
      select id from floq_plans where creator_id = auth.uid()
    )
  );