/*
# Create finanzas table for user income/expense tracking

1. New Tables
- `finanzas`
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (uuid, foreign key to auth.users, NOT NULL, defaults to auth.uid())
  - `tipo` (text, NOT NULL — 'Ingreso' or 'Gasto')
  - `categoria` (text, NOT NULL — category label)
  - `descripcion` (text, NOT NULL — description of the movement)
  - `valor` (numeric(12,2), NOT NULL — amount)
  - `fecha` (date, NOT NULL — date of the movement)
  - `created_at` (timestamptz, defaults to now())

2. Security
- Enable RLS on `finanzas`.
- Owner-scoped CRUD: each authenticated user can only access their own financial records.
- 4 separate policies (SELECT, INSERT, UPDATE, DELETE) scoped to `TO authenticated` with `auth.uid() = user_id` ownership checks.
- `user_id` has `DEFAULT auth.uid()` so inserts that omit the column still satisfy the INSERT WITH CHECK constraint.

3. Indexes
- Index on `user_id` for fast per-user queries.
- Index on `fecha` for date-range filtering.

4. Notes
- The frontend will insert/update records passing only tipo, categoria, descripcion, valor, fecha.
- All data is scoped to the authenticated user via RLS — no cross-user access.
*/

CREATE TABLE IF NOT EXISTS finanzas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('Ingreso', 'Gasto')),
  categoria text NOT NULL,
  descripcion text NOT NULL,
  valor numeric(12,2) NOT NULL,
  fecha date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE finanzas ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_finanzas_user_id ON finanzas(user_id);
CREATE INDEX IF NOT EXISTS idx_finanzas_fecha ON finanzas(fecha);

DROP POLICY IF EXISTS "select_own_finanzas" ON finanzas;
CREATE POLICY "select_own_finanzas" ON finanzas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_finanzas" ON finanzas;
CREATE POLICY "insert_own_finanzas" ON finanzas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_finanzas" ON finanzas;
CREATE POLICY "update_own_finanzas" ON finanzas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_finanzas" ON finanzas;
CREATE POLICY "delete_own_finanzas" ON finanzas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
