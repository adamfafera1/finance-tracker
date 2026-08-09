-- Add Fast Food expense category for existing users and new signups

INSERT INTO public.categories (user_id, name, type, icon, color)
SELECT p.id, 'Fast Food', 'expense', 'pi pi-shopping-bag', '#f43f5e'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = p.id AND c.name = 'Fast Food'
);

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
