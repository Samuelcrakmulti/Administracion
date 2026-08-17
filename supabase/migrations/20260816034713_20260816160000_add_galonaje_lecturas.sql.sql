/*
# Fase 2 — Lecturas, Mangueras y Galonaje

## Objetivo
Extender la tabla existente est_lecturas para soportar el sistema completo
de lecturas iniciales/finales por manguera, cálculo automático de galones,
continuidad entre turnos, auditoría de modificaciones, y relación con el
Cierre Operativo.

## Tabla modificada: est_lecturas (ya existe, sin datos)
Nuevas columnas:
- cierre_id (uuid, nullable) — FK a est_cierres, vincula la lectura al cierre operativo
- galones_vendidos (numeric, nullable) — calculado: lectura_final - lectura_inicial
- inicial_heredada (boolean, default true) — indica si la inicial vino del turno anterior
- inicial_modificada (boolean, default false) — indica si la inicial fue editada manualmente
- motivo_modificacion_inicial (text, nullable) — justificación si se modificó la inicial
- estado (text, default 'completa') — completa, incompleta, inconsistente, fuera_servicio
- turno_anterior_lectura_id (uuid, nullable) — FK a est_lecturas, lectura del turno previo
- updated_by (text, nullable) — usuario que modificó
- updated_at (timestamptz, default now())

Renombrar conceptualmente litros_vendidos → galones_vendidos (sin renombrar la columna
para no romper schema existente; se agrega galones_vendidos como columna nueva).

## Tabla nueva: est_lectura_auditoria
Registra cambios en lecturas: quién, cuándo, valor anterior, valor nuevo, motivo.

## Seguridad
RLS ya habilitado en est_lecturas. Nuevas columnas no requieren cambios de política.
est_lectura_auditoria con RLS + 4 políticas scoped TO authenticated.
*/

-- ─── est_lecturas: nuevas columnas ────────────────────────────────────────────
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS cierre_id uuid REFERENCES est_cierres(id) ON DELETE SET NULL;
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS galones_vendidos numeric;
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS inicial_heredada boolean NOT NULL DEFAULT true;
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS inicial_modificada boolean NOT NULL DEFAULT false;
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS motivo_modificacion_inicial text;
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'completa';
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS turno_anterior_lectura_id uuid REFERENCES est_lecturas(id) ON DELETE SET NULL;
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE est_lecturas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_est_lect_cierre ON est_lecturas(cierre_id);
CREATE INDEX IF NOT EXISTS idx_est_lect_manguera ON est_lecturas(manguera_id, estacion_id);
CREATE INDEX IF NOT EXISTS idx_est_lect_estado ON est_lecturas(estado);

-- ─── est_lectura_auditoria ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_lectura_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lectura_id uuid NOT NULL REFERENCES est_lecturas(id) ON DELETE CASCADE,
  cierre_id uuid REFERENCES est_cierres(id) ON DELETE SET NULL,
  campo_modificado text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  usuario text,
  motivo text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_lect_audit_lectura ON est_lectura_auditoria(lectura_id, created_at);
CREATE INDEX IF NOT EXISTS idx_est_lect_audit_cierre ON est_lectura_auditoria(cierre_id);

ALTER TABLE est_lectura_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_lect_audit_sel" ON est_lectura_auditoria;
CREATE POLICY "est_lect_audit_sel" ON est_lectura_auditoria FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_lect_audit_ins" ON est_lectura_auditoria;
CREATE POLICY "est_lect_audit_ins" ON est_lectura_auditoria FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_lect_audit_upd" ON est_lectura_auditoria;
CREATE POLICY "est_lect_audit_upd" ON est_lectura_auditoria FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_lect_audit_del" ON est_lectura_auditoria;
CREATE POLICY "est_lect_audit_del" ON est_lectura_auditoria FOR DELETE TO authenticated USING (auth.uid() = user_id);
