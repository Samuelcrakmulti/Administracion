/*
# Fase 4 — Inventario de Combustible y Control de Tanques

## Objetivo
Permitir administrar el inventario físico y teórico de combustible por estación:
tanques con niveles de alerta/crítico, inventario de apertura/cierre, entradas de
carrotanque, cálculo automático del inventario teórico (apertura + entradas - ventas
+ ajustes), comparación teórico vs físico con faltantes/sobrantes, alertas de nivel
bajo/crítico, historial de movimientos y auditoría.

## Tablas modificadas

### est_tanques (ya existe)
Nuevas columnas:
- capacidad_operativa_galones (numeric, default 0) — capacidad operativa recomendada
- nivel_alerta_galones (numeric, default 0) — nivel por debajo del cual se genera alerta
- nivel_critico_galones (numeric, default 0) — nivel crítico de abastecimiento
- producto_id ahora tiene historial de cambios vía est_tanque_historial

### est_inventario_diario (ya existe)
Nuevas columnas:
- nivel_teorico_galones (numeric, default 0) — inventario teórico calculado
- diferencia_galones (numeric, default 0) — diferencia físico - teórico
- estado_conciliacion (text, default 'pendiente') — pendiente/cuadrado/dentro_tolerancia/faltante/sobrante/requiere_revision
- justificacion (text, nullable) — motivo si hay diferencia fuera de tolerancia
- justificado_por (text, nullable)
- justificado_at (timestamptz, nullable)
- aprobado (boolean, default false) — si el inventario diario fue aprobado/bloqueado
- aprobado_por (text, nullable)
- aprobado_at (timestamptz, nullable)
- tolerancia_galones (numeric, default 0) — tolerancia aplicada al momento del cuadre

### est_movimientos_inventario (ya existe)
Nuevas columnas:
- proveedor (text, nullable) — para entradas de carrotanque
- numero_documento (text, nullable) — remisión/factura
- motivo (text, nullable) — para ajustes y correcciones
- valor_anterior (numeric, nullable) — para auditoría de cambios
- valor_nuevo (numeric, nullable) — para auditoría de cambios
- usuario (text, nullable) — usuario que registró el movimiento

## Tablas nuevas

### est_tanque_historial
Historial de cambios de configuración de tanques (capacidad, producto, niveles).
- id, user_id, tanque_id, estacion_id, campo_modificado, valor_anterior, valor_nuevo,
  motivo, usuario, created_at

### est_tolerancia_inventario
Tolerancia de inventario configurable por estación y opcionalmente por producto.
- id, user_id, estacion_id, producto_id (nullable), tolerancia_galones,
  estado (activo/inactivo), created_at

## Seguridad
RLS habilitado en todas las tablas nuevas con 4 políticas CRUD scoped TO authenticated.
Columnas user_id con DEFAULT auth.uid().
*/

-- ─── est_tanques: nuevas columnas ─────────────────────────────────────────────
ALTER TABLE est_tanques ADD COLUMN IF NOT EXISTS capacidad_operativa_galones numeric NOT NULL DEFAULT 0;
ALTER TABLE est_tanques ADD COLUMN IF NOT EXISTS nivel_alerta_galones numeric NOT NULL DEFAULT 0;
ALTER TABLE est_tanques ADD COLUMN IF NOT EXISTS nivel_critico_galones numeric NOT NULL DEFAULT 0;

-- ─── est_inventario_diario: nuevas columnas ───────────────────────────────────
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS nivel_teorico_galones numeric NOT NULL DEFAULT 0;
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS diferencia_galones numeric NOT NULL DEFAULT 0;
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS estado_conciliacion text NOT NULL DEFAULT 'pendiente';
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS justificacion text;
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS justificado_por text;
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS justificado_at timestamptz;
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS aprobado boolean NOT NULL DEFAULT false;
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS aprobado_por text;
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS aprobado_at timestamptz;
ALTER TABLE est_inventario_diario ADD COLUMN IF NOT EXISTS tolerancia_galones numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_est_inv_diario_estacion_fecha ON est_inventario_diario(estacion_id, fecha, tipo);

-- ─── est_movimientos_inventario: nuevas columnas ──────────────────────────────
ALTER TABLE est_movimientos_inventario ADD COLUMN IF NOT EXISTS proveedor text;
ALTER TABLE est_movimientos_inventario ADD COLUMN IF NOT EXISTS numero_documento text;
ALTER TABLE est_movimientos_inventario ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE est_movimientos_inventario ADD COLUMN IF NOT EXISTS valor_anterior numeric;
ALTER TABLE est_movimientos_inventario ADD COLUMN IF NOT EXISTS valor_nuevo numeric;
ALTER TABLE est_movimientos_inventario ADD COLUMN IF NOT EXISTS usuario text;

CREATE INDEX IF NOT EXISTS idx_est_mov_inv_estacion_fecha ON est_movimientos_inventario(estacion_id, fecha);
CREATE INDEX IF NOT EXISTS idx_est_mov_inv_tanque ON est_movimientos_inventario(tanque_id, fecha);

-- ─── est_tanque_historial ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_tanque_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tanque_id uuid NOT NULL REFERENCES est_tanques(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  campo_modificado text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  motivo text,
  usuario text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_th_tanque ON est_tanque_historial(tanque_id, created_at);
ALTER TABLE est_tanque_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_th_sel" ON est_tanque_historial;
CREATE POLICY "est_th_sel" ON est_tanque_historial FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_th_ins" ON est_tanque_historial;
CREATE POLICY "est_th_ins" ON est_tanque_historial FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_th_upd" ON est_tanque_historial;
CREATE POLICY "est_th_upd" ON est_tanque_historial FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_th_del" ON est_tanque_historial;
CREATE POLICY "est_th_del" ON est_tanque_historial FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── est_tolerancia_inventario ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_tolerancia_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES est_productos(id) ON DELETE SET NULL,
  tolerancia_galones numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'activo',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_tol_estacion ON est_tolerancia_inventario(estacion_id, estado);
ALTER TABLE est_tolerancia_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_tol_sel" ON est_tolerancia_inventario;
CREATE POLICY "est_tol_sel" ON est_tolerancia_inventario FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tol_ins" ON est_tolerancia_inventario;
CREATE POLICY "est_tol_ins" ON est_tolerancia_inventario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tol_upd" ON est_tolerancia_inventario;
CREATE POLICY "est_tol_upd" ON est_tolerancia_inventario FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tol_del" ON est_tolerancia_inventario;
CREATE POLICY "est_tol_del" ON est_tolerancia_inventario FOR DELETE TO authenticated USING (auth.uid() = user_id);
