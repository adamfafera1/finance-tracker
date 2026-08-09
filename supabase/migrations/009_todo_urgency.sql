-- Eisenhower-style urgency flag (independent of priority)
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_todos_user_urgent ON todos(user_id, is_completed, is_urgent)
  WHERE is_urgent = true;
