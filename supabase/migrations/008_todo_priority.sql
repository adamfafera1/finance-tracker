-- Task priority: high / medium / low (default medium)
CREATE TYPE todo_priority AS ENUM ('low', 'medium', 'high');

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS priority todo_priority NOT NULL DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_todos_user_priority ON todos(user_id, is_completed, priority);
