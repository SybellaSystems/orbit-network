/*
  Add HR workflow and document storage schema for Cogniforge.

  - Onboarding stage enum and member tracking
  - Agreement types and acceptance logs
  - Document metadata table for member files
  - Supabase storage bucket for document uploads
  - RBAC policies for agreements and documents
*/

-- Create onboarding stage enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_onboarding_stage') THEN
    CREATE TYPE public.member_onboarding_stage AS ENUM ('IDENTITY', 'TRAINING', 'ORIENTATION', 'AGREEMENT', 'APPROVAL', 'COMPLETE');
  END IF;
END$$;

-- Add onboarding fields to members
ALTER TABLE IF EXISTS public.members
  ADD COLUMN IF NOT EXISTS onboarding_stage public.member_onboarding_stage NOT NULL DEFAULT 'IDENTITY',
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Agreement engine tables
CREATE TABLE IF NOT EXISTS public.agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  orbit public.orbit_type,
  required_level integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid REFERENCES public.agreements(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  version integer NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  signature text,
  notes text
);

-- Documents table for member files
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  category text NOT NULL,
  document_type text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_documents_member ON public.documents(member_id);
CREATE INDEX IF NOT EXISTS idx_agreement_acceptances_member ON public.agreement_acceptances(member_id);

-- Create Supabase storage bucket for documents if it does not exist and if storage functions are available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'storage'
      AND p.proname = 'create_bucket'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'documents') THEN
      EXECUTE 'SELECT storage.create_bucket($1, $2)' USING 'documents', FALSE;
    END IF;
  END IF;
END$$;

-- Policies for agreements and acceptances
ALTER TABLE IF EXISTS public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agreements' AND policyname = 'public_select_agreements') THEN
    CREATE POLICY public_select_agreements ON public.agreements FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agreements' AND policyname = 'admins_manage_agreements') THEN
    CREATE POLICY admins_manage_agreements ON public.agreements FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role IN ('NETWORK_COUNCIL','ARCHITECTURE_BOARD')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role IN ('NETWORK_COUNCIL','ARCHITECTURE_BOARD')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agreement_acceptances' AND policyname = 'own_agreement_acceptances') THEN
    CREATE POLICY own_agreement_acceptances ON public.agreement_acceptances FOR SELECT, INSERT TO authenticated
      USING (member_id = auth.uid())
      WITH CHECK (member_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'own_documents') THEN
    CREATE POLICY own_documents ON public.documents FOR SELECT, INSERT, UPDATE, DELETE TO authenticated
      USING (member_id = auth.uid() OR uploaded_by = auth.uid())
      WITH CHECK (member_id = auth.uid() OR uploaded_by = auth.uid());
  END IF;
END$$;
