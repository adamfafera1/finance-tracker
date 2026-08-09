-- Favorite / main accounts shown on the dashboard
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_accounts_favorite ON accounts(user_id, is_favorite)
  WHERE is_favorite = true;
