-- Run this in Supabase SQL Editor if signup fails with "Database error saving new user"
-- Fixes the new-user trigger so it can insert profile + default categories under RLS

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.categories (user_id, name, type, icon, color) VALUES
    (NEW.id, 'Salary', 'income', 'pi pi-wallet', '#22c55e'),
    (NEW.id, 'Freelance', 'income', 'pi pi-briefcase', '#16a34a'),
    (NEW.id, 'Groceries', 'expense', 'pi pi-shopping-cart', '#ef4444'),
    (NEW.id, 'Fast Food', 'expense', 'pi pi-shopping-bag', '#f43f5e'),
    (NEW.id, 'Rent', 'expense', 'pi pi-home', '#f97316'),
    (NEW.id, 'Transport', 'expense', 'pi pi-car', '#3b82f6'),
    (NEW.id, 'Entertainment', 'expense', 'pi pi-star', '#a855f7'),
    (NEW.id, 'Utilities', 'expense', 'pi pi-bolt', '#eab308'),
    (NEW.id, 'Other', 'expense', 'pi pi-ellipsis-h', '#6b7280');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'handle_new_user failed: %', SQLERRM;
END;
$$;

-- Ensure trigger exists (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profile insert policy (for authenticated users updating their own row)
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow postgres/service role to manage seed data via trigger (categories)
DROP POLICY IF EXISTS categories_insert ON categories;
CREATE POLICY categories_insert ON categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
