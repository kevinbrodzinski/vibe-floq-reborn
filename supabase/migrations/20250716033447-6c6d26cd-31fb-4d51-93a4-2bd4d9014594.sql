-- get_afterglow_with_moments.sql
create or replace function public.get_afterglow_with_moments(
  p_afterglow_id uuid,
  p_user_id      uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare r jsonb;
begin
  if p_user_id is null then
    return jsonb_build_object('error','user not authenticated');
  end if;

  select jsonb_build_object(
    'afterglow', to_jsonb(da.*)            - 'moments',   -- all columns except the jsonb "moments"
    'moments',   jsonb_agg(am.* order by am.timestamp)
  )
  into r
  from daily_afterglow      da
  left join afterglow_moments am
    on am.daily_afterglow_id = da.id
  where da.id      = p_afterglow_id
    and da.user_id = p_user_id
  group by da.id;

  return coalesce(r, jsonb_build_object('error','not found'));
end;
$$;

grant execute on function public.get_afterglow_with_moments(uuid,uuid) to authenticated;