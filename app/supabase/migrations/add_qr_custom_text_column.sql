/*
  # Add QR Custom Text Column to Profiles

  1. Changes
    - Add `qr_custom_text` column to profiles table
    - This column stores optional custom text that appears below QR codes
    
  2. Details
    - Column is optional (nullable)
    - Character limit of 100 enforced at application level
    - No default value
*/

-- Add qr_custom_text column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'qr_custom_text'
  ) THEN
    ALTER TABLE profiles ADD COLUMN qr_custom_text text;
  END IF;
END $$;

-- Add comment to column for documentation
COMMENT ON COLUMN profiles.qr_custom_text IS 'Optional custom text displayed below QR code (max 100 characters)';