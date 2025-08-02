-- Grant execute permissions for seed_presence edge function
GRANT execute ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;