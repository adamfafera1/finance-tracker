-- Simple per-user todos
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_user_active ON todos(user_id, is_completed, created_at DESC);

CREATE OR REPLACE FUNCTION set_todo_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.is_completed AND (OLD.is_completed IS DISTINCT FROM TRUE) THEN
    NEW.completed_at := now();
  ELSIF NOT NEW.is_completed THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todos_completed_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION set_todo_completed_at();

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY todos_all ON todos
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
