-- supabase/migrations/001_initial_schema.sql
-- ITC Saathi - Initial Database Schema
-- Run: supabase db push

-- ─── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── User Profiles ─────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  business_name TEXT,
  gstin       TEXT CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  role        TEXT NOT NULL DEFAULT 'contractor' CHECK (role IN ('contractor', 'accountant', 'admin')),
  language    TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),
  dark_mode   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Invoices ──────────────────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url          TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_size         BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- max 10MB
  mime_type         TEXT NOT NULL CHECK (mime_type IN (
                      'application/pdf', 'image/jpeg', 'image/jpg',
                      'image/png', 'image/tiff'
                    )),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                      'pending', 'processing', 'extracted', 'verified',
                      'claimed', 'rejected', 'reconciled'
                    )),
  extracted_data    JSONB,
  manual_overrides  JSONB,
  gstr2b_matched    BOOLEAN NOT NULL DEFAULT false,
  gstr2b_match_date DATE,
  claim_id          UUID,  -- FK added after itc_claims table
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_uploaded_at ON public.invoices(uploaded_at DESC);
CREATE INDEX idx_invoices_claim_id ON public.invoices(claim_id);
-- GIN index for JSONB querying (invoice date, supplier name search)
CREATE INDEX idx_invoices_extracted_data ON public.invoices USING GIN (extracted_data);

-- ─── ITC Claims ────────────────────────────────────────────────────────────
CREATE TABLE public.itc_claims (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period        TEXT NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),  -- YYYY-MM
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'filed', 'adjusted')),
  invoice_ids   UUID[] NOT NULL DEFAULT '{}',
  total_cgst    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_sgst    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_igst    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_itc     NUMERIC(15,2) NOT NULL DEFAULT 0,
  blocked_itc   NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_itc       NUMERIC(15,2) NOT NULL DEFAULT 0,
  gstr3b_data   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filed_at      TIMESTAMPTZ,

  -- One claim per period per user
  UNIQUE (user_id, period)
);

CREATE INDEX idx_itc_claims_user_id ON public.itc_claims(user_id);
CREATE INDEX idx_itc_claims_period ON public.itc_claims(period DESC);

-- Add FK from invoices to claims (deferred so tables exist)
ALTER TABLE public.invoices
  ADD CONSTRAINT fk_invoices_claim
  FOREIGN KEY (claim_id) REFERENCES public.itc_claims(id) ON DELETE SET NULL;

-- ─── Updated-at Trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_itc_claims_updated_at
  BEFORE UPDATE ON public.itc_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itc_claims ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Invoices: users can CRUD only their own invoices
CREATE POLICY "invoices_select_own"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "invoices_insert_own"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices_update_own"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices_delete_own"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ITC Claims: users can CRUD only their own claims
CREATE POLICY "itc_claims_select_own"
  ON public.itc_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "itc_claims_insert_own"
  ON public.itc_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "itc_claims_update_own"
  ON public.itc_claims FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "itc_claims_delete_own"
  ON public.itc_claims FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Storage Buckets ───────────────────────────────────────────────────────
-- Create via Supabase dashboard or supabase CLI:
-- supabase storage create invoices --public false

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,  -- Private bucket — access via signed URLs only
  10485760,  -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own invoice files
CREATE POLICY "storage_invoices_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_invoices_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_invoices_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'invoices'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
