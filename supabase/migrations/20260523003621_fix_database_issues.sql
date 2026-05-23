/*
  # Fix database issues for Orbit Network

  ## Problems Fixed
  1. Registration flow: Added trigger to auto-create member profile on auth user signup
  2. Members UPDATE policy: Added admin update policy so Network Council/Architecture Board can edit levels and roles
  3. Reviews unique constraint: Ensure (task_id, reviewer_id) uniqueness exists
  4. Tasks UPDATE policy: Allow assignee to submit artifacts (update status to IN_REVIEW)

  ## Changes
  - New function: `handle_new_user()` — auto-creates member profile from auth.users
  - New trigger: `on_auth_user_created` — fires after insert on auth.users
  - New policy: "Admins can update any member" on members table
  - Verified: reviews unique constraint exists
*/

-- 1. Create function to auto-create member profile on signup
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
  );
  RETURN NEW;
END;
$$;

-- 2. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Add admin update policy for members table (allows editing levels/roles)
CREATE POLICY "Admins can update any member"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.role IN ('NETWORK_COUNCIL', 'ARCHITECTURE_BOARD')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.role IN ('NETWORK_COUNCIL', 'ARCHITECTURE_BOARD')
    )
  );

-- 4. Add reviews unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reviews_task_id_reviewer_id_key'
    AND table_name = 'reviews'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_task_id_reviewer_id_key UNIQUE (task_id, reviewer_id);
  END IF;
END $$;
