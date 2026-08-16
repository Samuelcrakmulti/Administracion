/*
# Cierre Operativo — Estructura Base

## Objetivo
Crear el contenedor principal "Cierre Operativo" que agrupa la operación
de una estación en una fecha + turno específico. Este será el registro
maestro sobre el cual se construirán en futuras fases:
  - Lecturas de mangueras (iniciales/finales)
  - Ventas y galonaje
  - Medios de pago y cuadre
  - Vales y ajustes
  - Inventario de combustible
  - Reportes e IA

## Tablas nuevas
1. est_cierres — Registro maestro del cierre operativo por estación/fecha/turno
2. est_cierre_auditoria — Registro de cambios de estado y modificaciones

## Tabla verificada (sin cambios)
- rrhh_empleados: ya posee estacion_id (uuid, nullable) — reutilizada para
  asociar empleados a estaciones sin modificar la tabla.

## Estados del cierre
  borrador → en_proceso → pendiente_revision → aprobado → cerrado
                                                   ↘ rechazado → en_proceso

## Seguridad
RLS habilitado en las 2 tablas nuevas. 4 políticas por tabla scoped TO authenticated.
Todas con user_id DEFAULT auth.uid() y políticas auth.uid() = user_id.
*/

-- ─── 1. est_cierres ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_cierres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  turno_id uuid REFERENCES est_turnos(id) ON DELETE SET NULL,
  empleado_id uuid REFERENCES rrhh_empleados(id) ON DELETE SET NULL,
  -- Información del turno (snapshot desnormalizado para historial independiente)
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  turno_label text NOT NULL DEFAULT 'Turno 1',
  empleado_nombre text,
  empleado_cargo text,
  empleado_documento text,
  -- Estado y flujo
  estado text NOT NULL DEFAULT 'borrador',
  -- Observaciones del operador
  observaciones text,
  -- Revisión
  revisado_por text,
  revisado_at timestamptz,
  revision_comentarios text,
  aprobado_por text,
  aprobado_at timestamptz,
  -- Auditoría
  created_by text,
  updated_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- No duplicar: misma estación + fecha + turno_label
  UNIQUE(estacion_id, fecha, turno_label)
);

CREATE INDEX IF NOT EXISTS idx_est_cierres_estacion ON est_cierres(estacion_id, fecha);
CREATE INDEX IF NOT EXISTS idx_est_cierres_estado ON est_cierres(estado);
CREATE INDEX IF NOT EXISTS idx_est_cierres_user ON est_cierres(user_id);

ALTER TABLE est_cierres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_cierres_sel" ON est_cierres;
CREATE POLICY "est_cierres_sel" ON est_cierres FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cierres_ins" ON est_cierres;
CREATE POLICY "est_cierres_ins" ON est_cierres FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cierres_upd" ON est_cierres;
CREATE POLICY "est_cierres_upd" ON est_cierres FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cierres_del" ON est_cierres;
CREATE POLICY "est_cierres_del" ON est_cierres FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 2. est_cierre_auditoria ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_cierre_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cierre_id uuid NOT NULL REFERENCES est_cierres(id) ON DELETE CASCADE,
  -- Cambio registrado
  accion text NOT NULL,
  estado_anterior text,
  estado_nuevo text,
  usuario text,
  motivo text,
  campo_modificado text,
  valor_anterior text,
  valor_nuevo text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_cierre_audit_cierre ON est_cierre_auditoria(cierre_id, created_at);

ALTER TABLE est_cierre_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_cierre_audit_sel" ON est_cierre_auditoria;
CREATE POLICY "est_cierre_audit_sel" ON est_cierre_auditoria FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cierre_audit_ins" ON est_cierre_auditoria;
CREATE POLICY "est_cierre_audit_ins" ON est_cierre_auditoria FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cierre_audit_upd" ON est_cierre_auditoria;
CREATE POLICY "est_cierre_audit_upd" ON est_cierre_auditoria FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cierre_audit_del" ON est_cierre_auditoria;
CREATE POLICY "est_cierre_audit_del" ON est_cierre_auditoria FOR DELETE TO authenticated USING (auth.uid() = user_id);
