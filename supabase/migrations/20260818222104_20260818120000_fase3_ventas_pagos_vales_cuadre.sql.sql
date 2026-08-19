/*
# Fase 3 — Ventas Monetarias, Precios, Pagos, Vales y Cuadre

## Objetivo
Convertir los galones calculados en la Fase 2 en ventas monetarias automáticas,
con precios históricos por estación, medios de pago configurables, vales,
ajustes, cuadre esperado vs real, faltantes/sobrantes, tolerancias y auditoría.

## Tablas modificadas

### est_precios_combustible (ya existe, vacía)
Nuevas columnas:
- hora_inicio (time, default '00:00') — hora de vigencia del precio
- created_by (text, nullable) — usuario que creó el precio

### est_cuadres (ya existe, vacía)
Nuevas columnas:
- cierre_id (uuid, FK est_cierres) — vincula el cuadre al cierre operativo
- ventas_esperadas_galones (numeric) — total galones del turno
- tolerancia (numeric, default 0) — tolerancia configurada al momento del cuadre
- estado_cuadre (text, default 'pendiente') — pendiente/cuadrado/dentro_tolerancia/faltante/sobrante/requiere_revision/aprobado/rechazado
- justificacion (text, nullable) — motivo si hay diferencia fuera de tolerancia
- justificado_por (text, nullable) — usuario que justificó
- justificado_at (timestamptz, nullable) — fecha de justificación
- aprobado_por (text, nullable)
- aprobado_at (timestamptz, nullable)
- updated_by (text, nullable)
- updated_at (timestamptz, default now())

## Tablas nuevas

### est_medios_pago_config
Configuración de medios de pago por estación.
- id, user_id, estacion_id, nombre, tipo (efectivo/tarjeta/transferencia/qr/otro),
  estado (activo/inactivo), orden, created_at

### est_pagos_turno
Pagos registrados por el operador durante un turno/cierre.
- id, user_id, cierre_id, estacion_id, medio_pago_config_id, medio_pago_nombre,
  valor, observacion, created_by, created_at, updated_at

### est_vales_conceptos
Conceptos configurables de vales por estación.
- id, user_id, estacion_id, nombre, descripcion, estado (activo/inactivo), created_at

### est_vales
Vales registrados durante un turno/cierre.
- id, user_id, cierre_id, estacion_id, concepto_id, concepto_nombre, valor,
  observacion, created_by, created_at

### est_ajustes
Ajustes generales justificados durante un turno/cierre.
- id, user_id, cierre_id, estacion_id, concepto, tipo (positivo/negativo),
  valor, motivo, created_by, created_at

### est_cuadre_auditoria
Auditoría de cambios financieros (precios, pagos, vales, ajustes, cuadres).
- id, user_id, cierre_id, estacion_id, tabla_afectada, registro_id,
  campo_modificado, valor_anterior, valor_nuevo, accion, usuario, motivo, created_at

## Seguridad
RLS habilitado en todas las tablas nuevas con 4 políticas CRUD scoped TO authenticated.
Columnas user_id con DEFAULT auth.uid().
*/

-- ─── est_precios_combustible: nuevas columnas ────────────────────────────────
ALTER TABLE est_precios_combustible ADD COLUMN IF NOT EXISTS hora_inicio time NOT NULL DEFAULT '00:00';
ALTER TABLE est_precios_combustible ADD COLUMN IF NOT EXISTS created_by text;

-- ─── est_cuadres: nuevas columnas ─────────────────────────────────────────────
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS cierre_id uuid REFERENCES est_cierres(id) ON DELETE SET NULL;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS ventas_esperadas_galones numeric NOT NULL DEFAULT 0;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS tolerancia numeric NOT NULL DEFAULT 0;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS estado_cuadre text NOT NULL DEFAULT 'pendiente';
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS justificacion text;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS justificado_por text;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS justificado_at timestamptz;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS aprobado_por text;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS aprobado_at timestamptz;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE est_cuadres ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_est_cuadres_cierre ON est_cuadres(cierre_id);
CREATE INDEX IF NOT EXISTS idx_est_cuadres_estacion ON est_cuadres(estacion_id);

-- ─── est_medios_pago_config ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_medios_pago_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'efectivo',
  estado text NOT NULL DEFAULT 'activo',
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_mpc_estacion ON est_medios_pago_config(estacion_id, estado);
ALTER TABLE est_medios_pago_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_mpc_sel" ON est_medios_pago_config;
CREATE POLICY "est_mpc_sel" ON est_medios_pago_config FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mpc_ins" ON est_medios_pago_config;
CREATE POLICY "est_mpc_ins" ON est_medios_pago_config FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mpc_upd" ON est_medios_pago_config;
CREATE POLICY "est_mpc_upd" ON est_medios_pago_config FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mpc_del" ON est_medios_pago_config;
CREATE POLICY "est_mpc_del" ON est_medios_pago_config FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── est_pagos_turno ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_pagos_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cierre_id uuid REFERENCES est_cierres(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  medio_pago_config_id uuid REFERENCES est_medios_pago_config(id) ON DELETE SET NULL,
  medio_pago_nombre text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  observacion text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_pagos_cierre ON est_pagos_turno(cierre_id);
CREATE INDEX IF NOT EXISTS idx_est_pagos_estacion ON est_pagos_turno(estacion_id);
ALTER TABLE est_pagos_turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_pagos_sel" ON est_pagos_turno;
CREATE POLICY "est_pagos_sel" ON est_pagos_turno FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_pagos_ins" ON est_pagos_turno;
CREATE POLICY "est_pagos_ins" ON est_pagos_turno FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_pagos_upd" ON est_pagos_turno;
CREATE POLICY "est_pagos_upd" ON est_pagos_turno FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_pagos_del" ON est_pagos_turno;
CREATE POLICY "est_pagos_del" ON est_pagos_turno FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── est_vales_conceptos ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_vales_conceptos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  estado text NOT NULL DEFAULT 'activo',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_vc_estacion ON est_vales_conceptos(estacion_id, estado);
ALTER TABLE est_vales_conceptos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_vc_sel" ON est_vales_conceptos;
CREATE POLICY "est_vc_sel" ON est_vales_conceptos FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_vc_ins" ON est_vales_conceptos;
CREATE POLICY "est_vc_ins" ON est_vales_conceptos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_vc_upd" ON est_vales_conceptos;
CREATE POLICY "est_vc_upd" ON est_vales_conceptos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_vc_del" ON est_vales_conceptos;
CREATE POLICY "est_vc_del" ON est_vales_conceptos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── est_vales ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_vales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cierre_id uuid REFERENCES est_cierres(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  concepto_id uuid REFERENCES est_vales_conceptos(id) ON DELETE SET NULL,
  concepto_nombre text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  observacion text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_vales_cierre ON est_vales(cierre_id);
CREATE INDEX IF NOT EXISTS idx_est_vales_estacion ON est_vales(estacion_id);
ALTER TABLE est_vales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_vales_sel" ON est_vales;
CREATE POLICY "est_vales_sel" ON est_vales FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_vales_ins" ON est_vales;
CREATE POLICY "est_vales_ins" ON est_vales FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_vales_upd" ON est_vales;
CREATE POLICY "est_vales_upd" ON est_vales FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_vales_del" ON est_vales;
CREATE POLICY "est_vales_del" ON est_vales FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── est_ajustes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_ajustes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cierre_id uuid REFERENCES est_cierres(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  concepto text NOT NULL,
  tipo text NOT NULL DEFAULT 'negativo',
  valor numeric NOT NULL DEFAULT 0,
  motivo text NOT NULL,
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_ajustes_cierre ON est_ajustes(cierre_id);
CREATE INDEX IF NOT EXISTS idx_est_ajustes_estacion ON est_ajustes(estacion_id);
ALTER TABLE est_ajustes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_ajustes_sel" ON est_ajustes;
CREATE POLICY "est_ajustes_sel" ON est_ajustes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_ajustes_ins" ON est_ajustes;
CREATE POLICY "est_ajustes_ins" ON est_ajustes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_ajustes_upd" ON est_ajustes;
CREATE POLICY "est_ajustes_upd" ON est_ajustes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_ajustes_del" ON est_ajustes;
CREATE POLICY "est_ajustes_del" ON est_ajustes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── est_cuadre_auditoria ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_cuadre_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cierre_id uuid REFERENCES est_cierres(id) ON DELETE CASCADE,
  estacion_id uuid REFERENCES estaciones(id) ON DELETE SET NULL,
  tabla_afectada text NOT NULL,
  registro_id uuid,
  campo_modificado text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  accion text NOT NULL,
  usuario text,
  motivo text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_ca_cierre ON est_cuadre_auditoria(cierre_id, created_at);
ALTER TABLE est_cuadre_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_ca_sel" ON est_cuadre_auditoria;
CREATE POLICY "est_ca_sel" ON est_cuadre_auditoria FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_ca_ins" ON est_cuadre_auditoria;
CREATE POLICY "est_ca_ins" ON est_cuadre_auditoria FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_ca_upd" ON est_cuadre_auditoria;
CREATE POLICY "est_ca_upd" ON est_cuadre_auditoria FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_ca_del" ON est_cuadre_auditoria;
CREATE POLICY "est_ca_del" ON est_cuadre_auditoria FOR DELETE TO authenticated USING (auth.uid() = user_id);
