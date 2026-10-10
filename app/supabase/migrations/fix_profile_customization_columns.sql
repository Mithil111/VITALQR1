/*
  # Fix Profile Customization Columns

  1. Changes
    - Add missing card_text_color column to profiles table
    - Ensure all QR customization columns exist with proper defaults
    
  2. Details
    - Adds card_text_color for text contrast on colored cards
    - Safe to run multiple times (checks existence first)
*/

-- Add card_text_color column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'card_text_color'
  ) THEN
    ALTER TABLE profiles ADD COLUMN card_text_color text DEFAULT '#000000';
  END IF;
END $$;

COMMENT ON COLUMN profiles.card_text_color IS 'Text color for medical ID card (hex format)';