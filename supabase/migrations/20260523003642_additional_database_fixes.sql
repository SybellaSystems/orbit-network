/*
  # Additional database fixes

  ## Changes
  1. Add message DELETE policy so users can delete their own messages
  2. Fix the handle_new_user function to handle re-runs gracefully (ON CONFLICT)
  3. Add index on members.role for faster admin queries
*/

-- 1. Make handle_new_user idempotent (handles re-trigger gracefully)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (id, name, email, orbit, level, role, contribution_score, skills)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'orbit')::orbit_type, 'FORGE'),
    0,
    'MEMBER',
    0,
    '{}'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Add messages delete policy
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- 3. Add index on members.role for admin query filtering
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
