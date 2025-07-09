-- Add missing RLS policies for floqs table to allow users to manage their own floqs

-- Allow users to create their own floqs
CREATE POLICY "Users can create their own floqs" 
ON public.floqs 
FOR INSERT 
WITH CHECK (creator_id = auth.uid());

-- Allow users to update their own floqs
CREATE POLICY "Users can update their own floqs" 
ON public.floqs 
FOR UPDATE 
USING (creator_id = auth.uid()) 
WITH CHECK (creator_id = auth.uid());

-- Allow users to delete their own floqs
CREATE POLICY "Users can delete their own floqs" 
ON public.floqs 
FOR DELETE 
USING (creator_id = auth.uid());