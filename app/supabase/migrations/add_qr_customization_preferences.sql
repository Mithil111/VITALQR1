/*
  # Add QR Customization Preferences

  1. Changes
    - Add columns to profiles table for QR customization preferences
    - Includes: custom text, text size, card colors, QR colors
    
  2. Details
    - All columns are optional with sensible defaults
    - Colors stored as hex codes
    - Text size stored as enum (small, medium, large)
*/

-- Add QR customization columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'qr_custom_text'
  ) THEN
    ALTER TABLE profiles ADD COLUMN qr_custom_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'qr_text_size'
  ) THEN
    ALTER TABLE profiles ADD COLUMN qr_text_size text DEFAULT 'medium';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'card_bg_color'
  ) THEN
    ALTER TABLE profiles ADD COLUMN card_bg_color text DEFAULT '#ffffff';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'qr_fg_color'
  ) THEN
    ALTER TABLE profiles ADD COLUMN qr_fg_color text DEFAULT '#000000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'qr_bg_color'
  ) THEN
    ALTER TABLE profiles ADD COLUMN qr_bg_color text DEFAULT '#ffffff';
  END IF;
END $$;

COMMENT ON COLUMN profiles.qr_custom_text IS 'Custom text displayed below QR code (max 100 characters)';
COMMENT ON COLUMN profiles.qr_text_size IS 'Font size for custom text: small, medium, or large';
COMMENT ON COLUMN profiles.card_bg_color IS 'Background color for medical ID card (hex format)';
COMMENT ON COLUMN profiles.qr_fg_color IS 'Foreground color for QR code (hex format)';
COMMENT ON COLUMN profiles.qr_bg_color IS 'Background color for QR code (hex format)';