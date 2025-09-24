-- Create notifications table for Realtime broadcasts
CREATE TABLE IF NOT EXISTS app_user_notification (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_user_notification ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own notifications
CREATE POLICY "owner" ON app_user_notification
  FOR SELECT USING (user_id = auth.uid());

-- Update build_daily_afterglow function to use notifications table
CREATE OR REPLACE FUNCTION public.build_daily_afterglow(_day date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.daily_afterglow(user_id, date, moments, total_venues)
  SELECT 
    user_id,
    _day,
    jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'timestamp', arrived_at,
        'title', v.name,
        'description', 'Visited ' || v.name,
        'color', '#3b82f6',
        'moment_type', 'venue_visit',
        'metadata', jsonb_build_object(
          'venue_id', v.id,
          'venue_name', v.name,
          'distance_m', distance_m,
          'location', jsonb_build_object(
            'lat', ST_Y(v.geom::geometry),
            'lng', ST_X(v.geom::geometry)
          )
        )
      ) ORDER BY arrived_at
    ),
    count(*)::INTEGER
  FROM public.venue_visits vv
  JOIN public.venues v ON v.id = vv.venue_id
  WHERE vv.day_key = _day
  GROUP BY user_id
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    moments = EXCLUDED.moments,
    total_venues = EXCLUDED.total_venues,
    regenerated_at = now();

  -- Notify users via Realtime-compatible table insert
  INSERT INTO app_user_notification (user_id, payload)
  SELECT 
    da.user_id,
    jsonb_build_object(
      'type', 'afterglow_ready',
      'date', _day,
      'id', da.id,
      'msg', 'Your afterglow is ready!'
    )
  FROM daily_afterglow da
  WHERE da.date = _day;
END;
$function$;