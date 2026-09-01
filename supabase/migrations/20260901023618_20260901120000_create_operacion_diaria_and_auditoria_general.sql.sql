/*
# Create daily operation state table and general audit log

1. New Tables
- `est_operacion_diaria` — Tracks the daily operational state of each station.
  Columns:
  - id (uuid PK)
  - user_id (uuid, defaults to auth.uid())
  - estacion_id (uuid FK → estaciones)
  - fecha (date, the operational day)
  - estado (text: no_iniciado, abierto, en_operacion, en_cierre, cerrado, reabierto)
  - inventario_inicial_confirmado (boolean, default false)
  - lecturas_iniciales_confirmadas (boolean, default false)
  - turnos_configurados (boolean, default false)
  - abierto_por (text, who opened the day)
  - abierto_at (timestamptz)
  - cerrado_por (text, who closed the day)
  - cerrado_at (timestamptz)
  - reabierto_por (text, who reopened)
  - reabierto_at (timestamptz)
  - motivo_reapertura (text)
  - resumen_cierre (jsonb, summary stats at close time)
  - created_at, updated_at (timestamptz)
  Unique constraint on (estacion_id, fecha) to prevent duplicate day records.

- `est_auditoria_general` — Generic audit trail for all critical record changes.
  Columns:
  - id (uuid PK)
  - user_id (uuid, defaults to auth.uid())
  - estacion_id (uuid, nullable)
  - tabla_afectada (text, which table was changed)
  - registro_id (uuid, which row was changed)
  - accion (text: creacion, modificacion, eliminacion, anulacion, reapertura)
  - campo_modificado (text, nullable)
  - valor_anterior (text, nullable)
  - valor_nuevo (text, nullable)
  - usuario (text, who made the change)
  - motivo (text, nullable)
  - created_at (timestamptz)

2. Security
- RLS enabled on both tables.
- Owner-scoped CRUD policies for authenticated users.
- user_id defaults to auth.uid() so inserts work without explicit user_id.

3. Notes
- est_operacion_diaria has a unique constraint on (estacion_id, fecha) so each station
  can only have one operational day record per date.
- est_auditoria_general is append-only: no UPDATE or DELETE policies are defined,
  meaning once an audit entry is written it cannot be modified or removed.
- Both tables reuse the existing estaciones FK for referential integrity.
*/

CREATE TABLE IF NOT EXISTS est_operacion_diaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  estado text NOT NULL DEFAULT 'no_iniciado',
  inventario_inicial_confirmado boolean NOT NULL DEFAULT false,
  lecturas_iniciales_confirmadas boolean NOT NULL DEFAULT false,
  turnos_configurados boolean NOT NULL DEFAULT false,
  abierto_por text,
  abierto_at timestamptz,
  cerrado_por text,
  cerrado_at timestamptz,
  reabierto_por text,
  reabierto_at timestamptz,
  motivo_reapertura text,
  resumen_cierre jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_est_operacion_diaria_unique
  ON est_operacion_diaria(estacion_id, fecha);

CREATE INDEX IF NOT EXISTS idx_est_operacion_diaria_estado
  ON est_operacion_diaria(estado);

ALTER TABLE est_operacion_diaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_operacion_diaria" ON est_operacion_diaria;
CREATE POLICY "select_own_operacion_diaria" ON est_operacion_diaria
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_operacion_diaria" ON est_operacion_diaria;
CREATE POLICY "insert_own_operacion_diaria" ON est_operacion_diaria
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_operacion_diaria" ON est_operacion_diaria;
CREATE POLICY "update_own_operacion_diaria" ON est_operacion_diaria
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_operacion_diaria" ON est_operacion_diaria;
CREATE POLICY "delete_own_operacion_diaria" ON est_operacion_diaria
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- General audit log (append-only: SELECT + INSERT only)
CREATE TABLE IF NOT EXISTS est_auditoria_general (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  estacion_id uuid REFERENCES estaciones(id) ON DELETE SET NULL,
  tabla_afectada text NOT NULL,
  registro_id uuid,
  accion text NOT NULL,
  campo_modificado text,
  valor_anterior text,
  valor_nuevo text,
  usuario text,
  motivo text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_auditoria_general_estacion
  ON est_auditoria_general(estacion_id);

CREATE INDEX IF NOT EXISTS idx_est_auditoria_general_tabla
  ON est_auditoria_general(tabla_afectada);

CREATE INDEX IF NOT EXISTS idx_est_auditoria_general_fecha
  ON est_auditoria_general(created_at DESC);

ALTER TABLE est_auditoria_general ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_auditoria_general" ON est_auditoria_general;
CREATE POLICY "select_own_auditoria_general" ON est_auditoria_general
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_auditoria_general" ON est_auditoria_general;
CREATE POLICY "insert_own_auditoria_general" ON est_auditoria_general
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
