/*
# Create empresas table for user business profiles

1. New Tables
- `empresas`
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (uuid, foreign key to auth.users, NOT NULL, defaults to auth.uid())
  - `nombre` (text, NOT NULL — the business name entered at registration)
  - `created_at` (timestamptz, defaults to now())

2. Security
- Enable RLS on `empresas`.
- Owner-scoped CRUD: each authenticated user can only access their own empresa row.
- 4 separate policies (SELECT, INSERT, UPDATE, DELETE) scoped to `TO authenticated` with `auth.uid() = user_id` ownership checks.
- `user_id` has `DEFAULT auth.uid()` so inserts that omit the column still satisfy the INSERT WITH CHECK constraint.

3. Notes
- The frontend will insert into this table right after sign-up, passing only `nombre`.
- Email confirmation stays OFF so sign-up immediately creates a usable session.
*/

CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_empresa" ON empresas;
CREATE POLICY "select_own_empresa" ON empresas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_empresa" ON empresas;
CREATE POLICY "insert_own_empresa" ON empresas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_empresa" ON empresas;
CREATE POLICY "update_own_empresa" ON empresas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_empresa" ON empresas;
CREATE POLICY "delete_own_empresa" ON empresas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
