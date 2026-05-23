/*
  Full platform schema for Orbit Network

  - Creates required extensions, enum types
  - Creates tables: members, tasks, reviews, promotions, messages
  - Adds indexes and constraints
  - Adds handle_new_user trigger to populate `members` on auth user creation
  - Enables RLS and policies for members and messages

  This file is idempotent and safe to run multiple times.
*/

-- Ensure UUID generator is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orbit_type') THEN
    CREATE TYPE public.orbit_type AS ENUM ('FORGE','LABS','CORE','OPEN','INTELLIGENCE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
    CREATE TYPE public.member_role AS ENUM ('MEMBER','ORBIT_LEAD','NETWORK_COUNCIL','ARCHITECTURE_BOARD');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE public.task_status AS ENUM ('PENDING','IN_REVIEW','COMPLETE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_status') THEN
    CREATE TYPE public.promotion_status AS ENUM ('PENDING','APPROVED','DEFERRED');
  END IF;
END$$;

-- Members table
CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text,
  orbit public.orbit_type NOT NULL DEFAULT 'FORGE',
  level integer NOT NULL DEFAULT 0,
  role public.member_role NOT NULL DEFAULT 'MEMBER',
  contribution_score numeric NOT NULL DEFAULT 0,
  skills text[] NOT NULL DEFAULT '{}',
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  orbit public.orbit_type NOT NULL DEFAULT 'FORGE',
  assignee_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  deadline timestamptz,
  status public.task_status NOT NULL DEFAULT 'PENDING',
  artifact_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  quality_score numeric NOT NULL DEFAULT 0,
  collaboration_score numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, reviewer_id)
);

-- Promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  from_level integer NOT NULL,
  to_level integer NOT NULL,
  status public.promotion_status NOT NULL DEFAULT 'PENDING',
  scorecard jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES public.members(id) ON DELETE SET NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  channel_id uuid,
  recipient_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  content text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_members_role ON public.members(role);
CREATE INDEX IF NOT EXISTS idx_reviews_task_id ON public.reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- Function: handle_new_user() - idempotent upsert for members when auth.users row is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (id, name, email, orbit, level, role, contribution_score, skills, joined_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'orbit')::public.orbit_type, 'FORGE'),
    0,
    'MEMBER',
    0,
    '{}',
    now()
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: on_auth_user_created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END$$;

-- Enable RLS and create sensible policies
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- allow authenticated users to select their own row
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'allow_select_own_member') THEN
    CREATE POLICY allow_select_own_member
      ON public.members FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;

  -- allow authenticated users to update their own profile
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'allow_update_own_member') THEN
    CREATE POLICY allow_update_own_member
      ON public.members FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;

  -- allow admins (based on members.role) to update any member
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'admins_update_members') THEN
    CREATE POLICY admins_update_members
      ON public.members FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role IN ('NETWORK_COUNCIL','ARCHITECTURE_BOARD')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role IN ('NETWORK_COUNCIL','ARCHITECTURE_BOARD')
        )
      );
  END IF;
END$$;

-- Messages: enable RLS and allow users to delete their own messages
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'allow_delete_own_messages') THEN
    CREATE POLICY allow_delete_own_messages
      ON public.messages FOR DELETE
      TO authenticated
      USING (sender_id = auth.uid());
  END IF;
END$$;

-- Final safety: ensure constraints exist (repeat of unique on reviews)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reviews_task_id_reviewer_id_key'
    AND table_name = 'reviews'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_task_id_reviewer_id_key UNIQUE (task_id, reviewer_id);
  END IF;
END$$;

-- End of migration
