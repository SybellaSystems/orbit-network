/*
  Add explicit row-level security policies for members table so
  authenticated users can read and update their own profile.
*/

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT their own member row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'allow_select_own_member'
  ) THEN
    CREATE POLICY allow_select_own_member
      ON public.members FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;
END$$;

-- Allow authenticated users to UPDATE their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'allow_update_own_member'
  ) THEN
    CREATE POLICY allow_update_own_member
      ON public.members FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END$$;

-- Allow authenticated users to INSERT own profile if desired (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'allow_insert_own_member'
  ) THEN
    CREATE POLICY allow_insert_own_member
      ON public.members FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;
END$$;

-- Add index to speed up lookups by id (if not present)
CREATE INDEX IF NOT EXISTS idx_members_id ON public.members(id);
