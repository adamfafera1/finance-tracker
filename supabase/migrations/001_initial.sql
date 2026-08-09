-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Account types
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'credit', 'cash', 'investment', 'loan', 'other');
CREATE TYPE account_kind AS ENUM ('asset', 'liability');
CREATE TYPE category_type AS ENUM ('income', 'expense');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL DEFAULT 'checking',
  kind account_kind NOT NULL DEFAULT 'asset',
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type category_type NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  type transaction_type NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transfer_pair_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- Balance delta helper
CREATE OR REPLACE FUNCTION get_balance_delta(
  p_kind account_kind,
  p_type transaction_type,
  p_amount NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF p_type = 'transfer' THEN
    RETURN 0;
  END IF;

  IF p_kind = 'asset' THEN
    IF p_type = 'income' THEN RETURN p_amount;
    ELSE RETURN -p_amount;
    END IF;
  ELSE
    IF p_type = 'expense' THEN RETURN p_amount;
    ELSE RETURN -p_amount;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update balance on transaction insert/update/delete
CREATE OR REPLACE FUNCTION update_account_balance_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_kind account_kind;
  v_delta NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT kind INTO v_kind FROM accounts WHERE id = NEW.account_id;
    v_delta := get_balance_delta(v_kind, NEW.type, NEW.amount);
    UPDATE accounts SET balance = balance + v_delta, updated_at = now() WHERE id = NEW.account_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT kind INTO v_kind FROM accounts WHERE id = OLD.account_id;
    v_delta := get_balance_delta(v_kind, OLD.type, OLD.amount);
    UPDATE accounts SET balance = balance - v_delta, updated_at = now() WHERE id = OLD.account_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT kind INTO v_kind FROM accounts WHERE id = OLD.account_id;
    v_delta := get_balance_delta(v_kind, OLD.type, OLD.amount);
    UPDATE accounts SET balance = balance - v_delta, updated_at = now() WHERE id = OLD.account_id;

    SELECT kind INTO v_kind FROM accounts WHERE id = NEW.account_id;
    v_delta := get_balance_delta(v_kind, NEW.type, NEW.amount);
    UPDATE accounts SET balance = balance + v_delta, updated_at = now() WHERE id = NEW.account_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transaction_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_transaction();

-- Create transfer (two linked transactions)
CREATE OR REPLACE FUNCTION create_transfer(
  p_user_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_transaction_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID AS $$
DECLARE
  v_pair_id UUID := gen_random_uuid();
  v_from_kind account_kind;
  v_to_kind account_kind;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT kind INTO v_from_kind FROM accounts WHERE id = p_from_account_id AND user_id = p_user_id;
  SELECT kind INTO v_to_kind FROM accounts WHERE id = p_to_account_id AND user_id = p_user_id;

  IF v_from_kind IS NULL OR v_to_kind IS NULL THEN
    RAISE EXCEPTION 'Invalid accounts';
  END IF;

  INSERT INTO transactions (user_id, account_id, amount, type, description, transaction_date, transfer_pair_id)
  VALUES (p_user_id, p_from_account_id, p_amount, 'transfer', p_description, p_transaction_date, v_pair_id);

  INSERT INTO transactions (user_id, account_id, amount, type, description, transaction_date, transfer_pair_id)
  VALUES (p_user_id, p_to_account_id, p_amount, 'transfer', p_description, p_transaction_date, v_pair_id);

  UPDATE accounts SET balance = balance - p_amount, updated_at = now()
  WHERE id = p_from_account_id AND kind = 'asset';
  UPDATE accounts SET balance = balance + p_amount, updated_at = now()
  WHERE id = p_to_account_id AND kind = 'asset';

  UPDATE accounts SET balance = balance + p_amount, updated_at = now()
  WHERE id = p_from_account_id AND kind = 'liability';
  UPDATE accounts SET balance = balance - p_amount, updated_at = now()
  WHERE id = p_to_account_id AND kind = 'liability';

  RETURN v_pair_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete transfer and reverse balances
CREATE OR REPLACE FUNCTION delete_transfer(p_user_id UUID, p_pair_id UUID)
RETURNS VOID AS $$
DECLARE
  v_from_id UUID;
  v_to_id UUID;
  v_amount NUMERIC;
  v_from_kind account_kind;
  v_to_kind account_kind;
BEGIN
  SELECT account_id, amount INTO v_from_id, v_amount
  FROM transactions
  WHERE transfer_pair_id = p_pair_id AND user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT account_id INTO v_to_id
  FROM transactions
  WHERE transfer_pair_id = p_pair_id AND user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_from_id IS NULL OR v_to_id IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  SELECT kind INTO v_from_kind FROM accounts WHERE id = v_from_id;
  SELECT kind INTO v_to_kind FROM accounts WHERE id = v_to_id;

  DELETE FROM transactions WHERE transfer_pair_id = p_pair_id AND user_id = p_user_id;

  IF v_from_kind = 'asset' THEN
    UPDATE accounts SET balance = balance + v_amount, updated_at = now() WHERE id = v_from_id;
  ELSE
    UPDATE accounts SET balance = balance - v_amount, updated_at = now() WHERE id = v_from_id;
  END IF;

  IF v_to_kind = 'asset' THEN
    UPDATE accounts SET balance = balance - v_amount, updated_at = now() WHERE id = v_to_id;
  ELSE
    UPDATE accounts SET balance = balance + v_amount, updated_at = now() WHERE id = v_to_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New user setup: profile + default categories
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
    (NEW.id, 'Rent', 'expense', 'pi pi-home', '#f97316'),
    (NEW.id, 'Transport', 'expense', 'pi pi-car', '#3b82f6'),
    (NEW.id, 'Entertainment', 'expense', 'pi pi-star', '#a855f7'),
    (NEW.id, 'Utilities', 'expense', 'pi pi-bolt', '#eab308'),
    (NEW.id, 'Other', 'expense', 'pi pi-ellipsis-h', '#6b7280');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY accounts_all ON accounts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY categories_all ON categories FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY transactions_all ON transactions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
