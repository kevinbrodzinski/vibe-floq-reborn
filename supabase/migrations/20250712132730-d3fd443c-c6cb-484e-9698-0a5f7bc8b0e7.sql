-- Add updated_at column to floqs table with automatic trigger
ALTER TABLE public.floqs ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to floqs table
CREATE TRIGGER update_floqs_updated_at
  BEFORE UPDATE ON public.floqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert demo users into profiles table
INSERT INTO public.profiles (id, username, display_name, avatar_url)
VALUES 
  ('demo-user-1', 'demo1', 'Demo User 1', NULL),
  ('demo-user-2', 'demo2', 'Demo User 2', NULL),
  ('demo-user-3', 'demo3', 'Demo User 3', NULL),
  ('demo-user-4', 'demo4', 'Demo User 4', NULL),
  ('demo-user-5', 'demo5', 'Demo User 5', NULL)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name;