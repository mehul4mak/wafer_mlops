-- ============================================================
-- SplitMate MVP – Initial Database Schema
-- Run against your Supabase project via the SQL editor or CLI
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Helper: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  currency    TEXT NOT NULL DEFAULT 'USD',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Groups ──────────────────────────────────────────────────
CREATE TYPE group_type AS ENUM (
  'trip','flatmate','project','event','wedding','office','family','custom'
);

CREATE TABLE groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  type         group_type NOT NULL DEFAULT 'custom',
  invite_code  TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  owner_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  currency     TEXT NOT NULL DEFAULT 'USD',
  image_url    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Group Members ────────────────────────────────────────────
CREATE TYPE member_role AS ENUM ('owner','admin','member');

CREATE TABLE group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       member_role NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user  ON group_members(user_id);

-- ── Expenses ────────────────────────────────────────────────
CREATE TYPE split_type AS ENUM ('equal','exact','percentage');
CREATE TYPE expense_category AS ENUM (
  'general','food','transport','accommodation','entertainment',
  'utilities','groceries','health','shopping','other'
);

CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL DEFAULT 'USD',
  paid_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  split_type   split_type NOT NULL DEFAULT 'equal',
  category     expense_category NOT NULL DEFAULT 'general',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  receipt_url  TEXT,
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_expenses_group    ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by  ON expenses(paid_by);
CREATE INDEX idx_expenses_date     ON expenses(date DESC);

-- ── Expense Splits ───────────────────────────────────────────
CREATE TABLE expense_splits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  percentage  NUMERIC(5,2),
  is_settled  BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at  TIMESTAMPTZ,
  UNIQUE (expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user    ON expense_splits(user_id);

-- ── Settlements ──────────────────────────────────────────────
CREATE TYPE settlement_status AS ENUM ('pending','completed','cancelled');

CREATE TABLE settlements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  payer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  payee_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency    TEXT NOT NULL DEFAULT 'USD',
  notes       TEXT,
  status      settlement_status NOT NULL DEFAULT 'pending',
  proof_url   TEXT,
  settled_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (payer_id <> payee_id)
);

CREATE TRIGGER trg_settlements_updated_at
  BEFORE UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_settlements_group  ON settlements(group_id);
CREATE INDEX idx_settlements_payer  ON settlements(payer_id);
CREATE INDEX idx_settlements_payee  ON settlements(payee_id);

-- ── Payment Proofs ───────────────────────────────────────────
CREATE TABLE payment_proofs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id  UUID REFERENCES settlements(id) ON DELETE CASCADE,
  expense_id     UUID REFERENCES expenses(id) ON DELETE CASCADE,
  uploaded_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  file_url       TEXT NOT NULL,
  file_type      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (settlement_id IS NOT NULL OR expense_id IS NOT NULL)
);

-- ── Tasks ────────────────────────────────────────────────────
CREATE TYPE task_status   AS ENUM ('pending','in_progress','completed');
CREATE TYPE task_priority AS ENUM ('low','medium','high');

CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  expense_id   UUID REFERENCES expenses(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  assigned_to  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  due_date     DATE,
  status       task_status NOT NULL DEFAULT 'pending',
  priority     task_priority NOT NULL DEFAULT 'medium',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_tasks_group       ON tasks(group_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date    ON tasks(due_date);

-- ── Notifications ────────────────────────────────────────────
CREATE TYPE notification_type AS ENUM (
  'new_expense','expense_settled','settlement_request','settlement_completed',
  'task_assigned','task_due','group_invite','balance_reminder','payment_proof'
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user     ON notifications(user_id);
CREATE INDEX idx_notifications_is_read  ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created  ON notifications(created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit only their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Groups: members can read; owner manages
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "groups_insert" ON groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "groups_update" ON groups FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
      AND gm.role IN ('owner','admin')
  ));

-- Group Members
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
        AND gm.role IN ('owner','admin')
    ) OR user_id = auth.uid()  -- joining via invite
  );

-- Expenses: group members can read; creator/payer can manage
CREATE POLICY "expenses_select" ON expenses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = expenses.group_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = expenses.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_update" ON expenses FOR UPDATE
  USING (created_by = auth.uid() OR paid_by = auth.uid());

-- Expense Splits
CREATE POLICY "expense_splits_select" ON expense_splits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_splits.expense_id AND gm.user_id = auth.uid()
  ));

-- Settlements
CREATE POLICY "settlements_select" ON settlements FOR SELECT
  USING (payer_id = auth.uid() OR payee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = settlements.group_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "settlements_insert" ON settlements FOR INSERT
  WITH CHECK (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "settlements_update" ON settlements FOR UPDATE
  USING (payer_id = auth.uid() OR payee_id = auth.uid());

-- Tasks
CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = tasks.group_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = tasks.group_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (
    created_by = auth.uid() OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = tasks.group_id AND gm.user_id = auth.uid()
        AND gm.role IN ('owner','admin')
    )
  );

-- Notifications: users see only their own
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Payment Proofs
CREATE POLICY "payment_proofs_select" ON payment_proofs FOR SELECT
  USING (uploaded_by = auth.uid() OR EXISTS (
    SELECT 1 FROM settlements s
    JOIN group_members gm ON gm.group_id = s.group_id
    WHERE s.id = payment_proofs.settlement_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "payment_proofs_insert" ON payment_proofs FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- Useful views
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW group_balances AS
SELECT
  gm.group_id,
  gm.user_id,
  p.full_name,
  p.email,
  p.avatar_url,
  COALESCE(paid.total_paid, 0) - COALESCE(owed.total_owed, 0) AS net_balance
FROM group_members gm
JOIN profiles p ON p.id = gm.user_id
LEFT JOIN (
  SELECT group_id, paid_by AS user_id, SUM(amount) AS total_paid
  FROM expenses GROUP BY group_id, paid_by
) paid ON paid.group_id = gm.group_id AND paid.user_id = gm.user_id
LEFT JOIN (
  SELECT e.group_id, es.user_id, SUM(es.amount) AS total_owed
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.is_settled = FALSE
  GROUP BY e.group_id, es.user_id
) owed ON owed.group_id = gm.group_id AND owed.user_id = gm.user_id;
