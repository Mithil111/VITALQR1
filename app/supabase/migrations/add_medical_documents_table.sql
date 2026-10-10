/*
  # Add Medical Documents Table

  1. New Tables
    - `medical_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `document_name` (text)
      - `document_type` (text) - 'prescription' or 'surgery'
      - `document_url` (text)
      - `file_size` (bigint)
      - `uploaded_at` (timestamp)
      - `notes` (text, optional)

  2. Security
    - Enable RLS on `medical_documents` table
    - Add policies for authenticated users to manage their own documents
*/

-- Create medical_documents table if not exists
CREATE TABLE IF NOT EXISTS medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_name text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('prescription', 'surgery')),
  document_url text NOT NULL,
  file_size bigint,
  notes text,
  uploaded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "documents_select_own" ON medical_documents;
DROP POLICY IF EXISTS "documents_insert_own" ON medical_documents;
DROP POLICY IF EXISTS "documents_update_own" ON medical_documents;
DROP POLICY IF EXISTS "documents_delete_own" ON medical_documents;

-- Create policies for CRUD operations
CREATE POLICY "documents_select_own" ON medical_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "documents_insert_own" ON medical_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_update_own" ON medical_documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "documents_delete_own" ON medical_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_medical_documents_user_id ON medical_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_type ON medical_documents(document_type);