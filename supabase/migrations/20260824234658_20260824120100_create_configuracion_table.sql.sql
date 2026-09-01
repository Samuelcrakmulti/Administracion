/*
# Create est_configuracion table for import tolerance settings

1. New Tables
- `est_configuracion` — Per-user configuration for import tolerance.
  - id (uuid PK)
  - user_id (uuid, defaults to auth.uid(), unique)
  - tolerancia_galones (numeric, default 0.10)
  - tolerancia_dinero (numeric, default 1000)
  - created_at, updated_at (timestamptz)

2. Security
- RLS enabled, owner-scoped CRUD.
*/

CREATE TABLE IF NOT EXISTS est_configuracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tolerancia_galones numeric NOT NULL DEFAULT 0.10,
  tolerancia_dinero numeric NOT NULL DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE est_configuracion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_config" ON est_configuracion;
CREATE POLICY "select_own_config" ON est_configuracion FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_config" ON est_configuracion;
CREATE POLICY "insert_own_config" ON est_configuracion FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_config" ON est_configuracion;
CREATE POLICY "update_own_config" ON est_configuracion FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_config" ON est_configuracion;
CREATE POLICY "delete_own_config" ON est_configuracion FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
