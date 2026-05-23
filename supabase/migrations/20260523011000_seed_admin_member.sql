/*
  Seed or update an admin member profile for BESSORA Neema Hirwa.

  NOTE: This migration creates/updates the `members` row only. Creating
  the corresponding auth user (so the person can sign in with the
  provided password) must be done via the Supabase dashboard, CLI, or
  the Admin API. After creating the auth user, ensure the `members.id`
  matches the auth user's id (update `members.id` if necessary).

  Suggested steps to create the auth user after running this migration:

  # 1) Create the user via the Supabase dashboard or Admin API with
     email: bessora@sybellasystems.co.rw
     password: Admin@123

  # 2) If the created auth user's id differs from the seeded member id,
     run:
       UPDATE public.members SET id = '<AUTH_USER_ID>' WHERE email = 'bessora@sybellasystems.co.rw';

  This migration is idempotent and safe to run multiple times.
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

-- Upsert the admin member by email
INSERT INTO public.members (id, name, email, orbit, level, role, contribution_score, skills, joined_at)
VALUES (
  gen_random_uuid(),
  'BESSORA Neema Hirwa',
  'bessora@sybellasystems.co.rw',
  'CORE',
  7,
  'ARCHITECTURE_BOARD',
  15,
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
