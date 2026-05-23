/*
  Seed or update a council member profile for BESSORA (council) with email bessora579@gmail.com.

  NOTE: This migration only creates/updates the `members` row. To allow
  sign-in the corresponding Supabase auth user must be created via the
  Supabase dashboard, Admin API, or CLI. After creating the auth user,
  update `members.id` to match the auth user id if they differ.

  This file is idempotent and safe to run multiple times.
*/

DO $$
BEGIN
  -- Ensure a unique constraint on email exists for upsert behavior
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'ux_members_email' AND t.relname = 'members'
  ) THEN
    ALTER TABLE public.members ADD CONSTRAINT ux_members_email UNIQUE (email);
  END IF;
END$$;

-- Upsert the council member by email
INSERT INTO public.members (id, name, email, orbit, level, role, contribution_score, skills, joined_at)
VALUES (
  gen_random_uuid(),
  'BESSORA Neema Hirwa',
  'bessora579@gmail.com',
  'CORE',
  7,
  'NETWORK_COUNCIL',
  12,
  ARRAY[]::text[],
  now()
)
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      orbit = EXCLUDED.orbit,
      level = EXCLUDED.level,
      role = EXCLUDED.role,
      contribution_score = EXCLUDED.contribution_score,
      skills = COALESCE(public.members.skills, EXCLUDED.skills),
      joined_at = COALESCE(public.members.joined_at, EXCLUDED.joined_at);
