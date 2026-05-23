-- ORBITS Agreement Management System (templates + instances + parties + logs + PDF)
-- Idempotent migration: safe to run multiple times.

-- NOTE:
-- This migration extends the existing HR agreements approach already present in
-- 20260523013000_hr_agreements_documents.sql.

-- 1) Types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agreement_type') THEN
    CREATE TYPE public.agreement_type AS ENUM ('PARTNERSHIP','NDA','CONTRIBUTION','INVESTMENT','SERVICE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agreement_instance_status') THEN
    CREATE TYPE public.agreement_instance_status AS ENUM (
      'draft','pending_signature','signed','active','terminated'
    );
  END IF;
END$$;

-- 2) agreements (templates)
CREATE TABLE IF NOT EXISTS public.agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.agreement_type NOT NULL,
  title text NOT NULL,

  -- template_body is JSONB so we can store placeholders + required-fields metadata
  -- and future localization/sections without losing structure.
  template_body jsonb NOT NULL,

  version integer NOT NULL DEFAULT 1,
  orbit public.orbit_type,
  required_level integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) agreement_instances
CREATE TABLE IF NOT EXISTS public.agreement_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  filled_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.agreement_instance_status NOT NULL DEFAULT 'draft',
  pdf_url text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) agreement_parties
CREATE TABLE IF NOT EXISTS public.agreement_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_instance_id uuid NOT NULL REFERENCES public.agreement_instances(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  id_number text,
  role text NOT NULL,
  signature_data text, -- base64 data URL or storage URL
  signature_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) agreement_logs
CREATE TABLE IF NOT EXISTS public.agreement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_instance_id uuid NOT NULL REFERENCES public.agreement_instances(id) ON DELETE CASCADE,
  action text NOT NULL, -- created/edited/signed/exported/terminated
  performed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_agreement_instances_agreement_id ON public.agreement_instances(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_instances_created_by ON public.agreement_instances(created_by);
CREATE INDEX IF NOT EXISTS idx_agreement_logs_instance_id ON public.agreement_logs(agreement_instance_id);

-- 6) updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agreements_updated_at') THEN
    CREATE TRIGGER trg_agreements_updated_at
    BEFORE UPDATE ON public.agreements
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agreement_instances_updated_at') THEN
    CREATE TRIGGER trg_agreement_instances_updated_at
    BEFORE UPDATE ON public.agreement_instances
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agreement_parties_updated_at') THEN
    CREATE TRIGGER trg_agreement_parties_updated_at
    BEFORE UPDATE ON public.agreement_parties
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 7) RLS policies
ALTER TABLE IF EXISTS public.agreement_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agreement_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agreement_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Templates: admins can manage; others can read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agreements' AND policyname='agreements_admin_manage'
  ) THEN
    CREATE POLICY agreements_admin_manage ON public.agreements
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = auth.uid() AND m.role IN ('NETWORK_COUNCIL','ARCHITECTURE_BOARD')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = auth.uid() AND m.role IN ('NETWORK_COUNCIL','ARCHITECTURE_BOARD')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agreements' AND policyname='agreements_public_read'
  ) THEN
    CREATE POLICY agreements_public_read ON public.agreements
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- Instances: allow users to see instances where they are a party OR created_by
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agreement_instances' AND policyname='instance_own_access'
  ) THEN
    CREATE POLICY instance_own_access ON public.agreement_instances
      FOR SELECT TO authenticated
      USING (
        created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.agreement_parties p
          WHERE p.agreement_instance_id = agreement_instances.id
        )
      );
  END IF;

  -- Instances create/update/sign/export: allow created_by to draft/edit until signed
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agreement_instances' AND policyname='instance_mutations_allowed'
  ) THEN
    CREATE POLICY instance_mutations_allowed ON public.agreement_instances
      FOR INSERT, UPDATE TO authenticated
      WITH CHECK (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agreement_parties' AND policyname='parties_own_mutations'
  ) THEN
    CREATE POLICY parties_own_mutations ON public.agreement_parties
      FOR INSERT, UPDATE, SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agreement_instances i
          WHERE i.id = agreement_parties.agreement_instance_id AND i.created_by = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.agreement_instances i
          WHERE i.id = agreement_parties.agreement_instance_id AND i.created_by = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agreement_logs' AND policyname='logs_own_access'
  ) THEN
    CREATE POLICY logs_own_access ON public.agreement_logs
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agreement_instances i
          WHERE i.id = agreement_logs.agreement_instance_id AND i.created_by = auth.uid()
        )
      );
  END IF;

END$$;

-- 8) Backward-compatibility notes
-- Existing columns in the prior migration may not match. We do NOT drop old tables here.
-- Next step after deploying this migration: adjust HR admin UI to write into template_body/type
-- and create instances via API.

