/*
# Expand empresas + create user_settings

## 1. Expand `empresas` table
Adds rich company profile fields to the existing minimal `empresas` table.
New columns:
- razon_social (text) — legal business name
- nit (text) — tax ID / NIT
- email (text) — business email
- telefono (text)
- sitio_web (text)
- direccion (text)
- ciudad (text)
- pais (text, default 'Colombia')
- moneda (text, default 'COP')
- zona_horaria (text, default 'America/Bogota')
- sector (text) — economic sector
- empleados (text) — employee count range
- descripcion (text)
- logo_url (text) — URL to logo image
- updated_at (timestamptz)

## 2. New table: `user_settings`
Stores flexible per-user settings as JSONB. One row per user.
- id (uuid, PK)
- user_id (uuid, FK auth.users, UNIQUE)
- settings (jsonb, default '{}') — stores notifications, AI, appearance, modules config
- updated_at (timestamptz)

## 3. Security
RLS enabled on both tables.
Owner-scoped 4-policy CRUD for authenticated users.
*/

-- Expand empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS razon_social text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS nit text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sitio_web text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ciudad text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Colombia';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS moneda text DEFAULT 'COP';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS zona_horaria text DEFAULT 'America/Bogota';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sector text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS empleados text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "us_select" ON user_settings;
CREATE POLICY "us_select" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "us_insert" ON user_settings;
CREATE POLICY "us_insert" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "us_update" ON user_settings;
CREATE POLICY "us_update" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "us_delete" ON user_settings;
CREATE POLICY "us_delete" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
