-- Named shopping lists (e.g. Groceries, Home appliances)
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);

CREATE OR REPLACE FUNCTION set_shopping_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION set_shopping_lists_updated_at();

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY shopping_lists_all ON shopping_lists
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Attach existing items to a per-user "General" list, then require list_id
ALTER TABLE shopping_list_items
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE;

INSERT INTO shopping_lists (user_id, name)
SELECT DISTINCT user_id, 'General'
FROM shopping_list_items
WHERE list_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM shopping_lists sl
    WHERE sl.user_id = shopping_list_items.user_id
      AND sl.name = 'General'
  );

UPDATE shopping_list_items AS items
SET list_id = lists.id
FROM shopping_lists AS lists
WHERE items.list_id IS NULL
  AND lists.user_id = items.user_id
  AND lists.name = 'General';

-- Drop orphaned items that somehow still lack a list (should be none)
DELETE FROM shopping_list_items WHERE list_id IS NULL;

ALTER TABLE shopping_list_items
  ALTER COLUMN list_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id
  ON shopping_list_items(list_id, is_checked, created_at DESC);
