-- Function to auto-create profile on user signup (IMPROVED VERSION)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, language_preference)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.email,
      'New User'
    ),
    'en'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Safely drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();