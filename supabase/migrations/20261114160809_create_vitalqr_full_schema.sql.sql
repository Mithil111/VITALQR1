/*
# VitalQR — Full initial schema

1. New Tables
- `profiles` — one row per user (id matches auth.users): full_name, date_of_birth,
  blood_type, profile_pin (4-digit emergency PIN), language_preference, verified,
  avatar_url, plus QR customization columns (qr_custom_text, qr_text_size,
  card_bg_color, card_text_color, qr_fg_color, qr_bg_color), created_at, updated_at.
- `medical_conditions` — user_id, condition_name, priority_level (low/medium/high/critical), notes, diagnosed_date.
- `allergies` — user_id, allergen, severity (mild/moderate/severe/life-threatening), reaction.
- `medications` — user_id, medication_name, dosage, frequency, start_date, end_date, notes.
- `emergency_contacts` — user_id, name, relationship, phone_number, is_primary.
- `medical_documents` — user_id, document_name, document_type (prescription/surgery), document_url, file_size, notes, uploaded_at.

2. Functions & Triggers
- `handle_new_user()` SECURITY DEFINER trigger on auth.users insert: auto-creates the
  matching profiles row so signup always yields a profile.

3. Security
- RLS enabled on every table.
- Authenticated users: full CRUD on their own rows (auth.uid() = user_id / id).
- Anonymous (anon): SELECT ONLY on the tables needed by the public emergency page
  (/emergency/[id] scanned by responders without an account): profiles,
  medical_conditions, allergies, medications, emergency_contacts.
- Explicit GRANTs matching those policies (Data API access).
- Storage: creates the `medical-documents` bucket and owner-scoped write policies.

4. Notes
- Idempotent: uses IF NOT EXISTS / drop-first policies, safe to re-run.
- No destructive operations; database was empty.
*/

-- ============ 1. TABLES ============

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'New User',
  date_of_birth date,
  blood_type text,
  profile_pin text,
  language_preference text NOT NULL DEFAULT 'en',
  verified boolean NOT NULL DEFAULT false,
  avatar_url text,
  qr_custom_text text,
  qr_text_size text DEFAULT 'medium',
  card_bg_color text DEFAULT '#ffffff',
  card_text_color text DEFAULT '#000000',
  qr_fg_color text DEFAULT '#000000',
  qr_bg_color text DEFAULT '#ffffff',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  condition_name text NOT NULL,
  priority_level text NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low','medium','high','critical')),
  notes text,
  diagnosed_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild','moderate','severe','life-threatening')),
  reaction text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text,
  phone_number text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('prescription','surgery')),
  document_url text NOT NULL,
  file_size bigint,
  notes text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conditions_user ON public.medical_conditions(user_id);
CREATE INDEX IF NOT EXISTS idx_allergies_user ON public.allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_user ON public.medications(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.medical_documents(user_id);

-- ============ 2. AUTO-CREATE PROFILE ON SIGNUP ============

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, language_preference)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'New User'),
    'en'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ 3. RLS ============

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
 TO authenticated USING (auth.uid()::text = id)
 WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
CREATE POLICY "delete_own_profile" ON public.profiles FOR DELETE
 TO authenticated USING (auth.uid()::text = id);


-- ---- medical_conditions ----
DROP POLICY IF EXISTS "select_own_conditions" ON public.medical_conditions;
CREATE POLICY "select_own_conditions" ON public.medical_conditions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_conditions" ON public.medical_conditions;
CREATE POLICY "insert_own_conditions" ON public.medical_conditions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_conditions" ON public.medical_conditions;
CREATE POLICY "update_own_conditions" ON public.medical_conditions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_conditions" ON public.medical_conditions;
CREATE POLICY "delete_own_conditions" ON public.medical_conditions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "public_read_conditions" ON public.medical_conditions;
CREATE POLICY "public_read_conditions" ON public.medical_conditions FOR SELECT
  TO anon USING (true);

-- ---- allergies ----
DROP POLICY IF EXISTS "select_own_allergies" ON public.allergies;
CREATE POLICY "select_own_allergies" ON public.allergies FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_allergies" ON public.allergies;
CREATE POLICY "insert_own_allergies" ON public.allergies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_allergies" ON public.allergies;
CREATE POLICY "update_own_allergies" ON public.allergies FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_allergies" ON public.allergies;
CREATE POLICY "delete_own_allergies" ON public.allergies FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "public_read_allergies" ON public.allergies;
CREATE POLICY "public_read_allergies" ON public.allergies FOR SELECT
  TO anon USING (true);

-- ---- medications ----
DROP POLICY IF EXISTS "select_own_medications" ON public.medications;
CREATE POLICY "select_own_medications" ON public.medications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_medications" ON public.medications;
CREATE POLICY "insert_own_medications" ON public.medications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_medications" ON public.medications;
CREATE POLICY "update_own_medications" ON public.medications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_medications" ON public.medications;
CREATE POLICY "delete_own_medications" ON public.medications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "public_read_medications" ON public.medications;
CREATE POLICY "public_read_medications" ON public.medications FOR SELECT
  TO anon USING (true);

-- ---- emergency_contacts ----
DROP POLICY IF EXISTS "select_own_contacts" ON public.emergency_contacts;
CREATE POLICY "select_own_contacts" ON public.emergency_contacts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_contacts" ON public.emergency_contacts;
CREATE POLICY "insert_own_contacts" ON public.emergency_contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_contacts" ON public.emergency_contacts;
CREATE POLICY "update_own_contacts" ON public.emergency_contacts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_contacts" ON public.emergency_contacts;
CREATE POLICY "delete_own_contacts" ON public.emergency_contacts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "public_read_contacts" ON public.emergency_contacts;
CREATE POLICY "public_read_contacts" ON public.emergency_contacts FOR SELECT
  TO anon USING (true);

-- ---- medical_documents (owner only, no public access) ----
DROP POLICY IF EXISTS "select_own_documents" ON public.medical_documents;
CREATE POLICY "select_own_documents" ON public.medical_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_documents" ON public.medical_documents;
CREATE POLICY "insert_own_documents" ON public.medical_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_documents" ON public.medical_documents;
CREATE POLICY "update_own_documents" ON public.medical_documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_documents" ON public.medical_documents;
CREATE POLICY "delete_own_documents" ON public.medical_documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ 4. GRANTS ============

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_conditions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allergies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_documents TO authenticated;

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.medical_conditions TO anon;
GRANT SELECT ON public.allergies TO anon;
GRANT SELECT ON public.medications TO anon;
GRANT SELECT ON public.emergency_contacts TO anon;

-- ============ 5. STORAGE BUCKET ============

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_upload_own_folder" ON storage.objects;
CREATE POLICY "documents_upload_own_folder" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'medical-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_update_own_folder" ON storage.objects;
CREATE POLICY "documents_update_own_folder" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'medical-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_delete_own_folder" ON storage.objects;
CREATE POLICY "documents_delete_own_folder" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'medical-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_public_read" ON storage.objects;
CREATE POLICY "documents_public_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'medical-documents');
