/*
# Fase 3 — Control de Inventario de Combustibles para Estaciones de Servicio

## Objetivo
Sistema profesional de control de tanques, existencias, entradas de carrotanques,
inventario diario, consumo automático por ventas, alertas e historial completo.

## Tablas nuevas
1. est_tanques — Tanques de almacenamiento por estación (capacidad en galones)
2. est_inventario_diario — Registro diario de inventario inicial/final por tanque (histórico, nunca se sobrescribe)
3. est_carrotanques — Descargas de combustible (entradas), actualizan inventario automáticamente
4. est_movimientos_inventario — Movimientos de inventario (entradas, salidas por ventas, ajustes)
5. est_precios_combustible — Historial de precios por galón por combustible (nunca se borra)
6. est_alertas_inventario — Alertas automáticas de inventario

## Relaciones
- Todas las tablas tienen user_id (DEFAULT auth.uid()) y están relacionadas con estaciones
- est_tanques → estaciones, est_productos (tipo de combustible)
- est_inventario_diario → est_tanques, estaciones
- est_carrotanques → est_tanques, est_productos, estaciones
- est_movimientos_inventario → est_tanques, estaciones (movimientos de entrada/salida)
- est_precios_combustible → est_productos, estaciones
- est_alertas_inventario → est_tanques, estaciones

## Unidades
TODO en GALONES. Las columnas usan numeric con precisión suficiente.

## Seguridad
RLS habilitado en todas las tablas. 4 políticas (SELECT, INSERT, UPDATE, DELETE) por tabla,
scoped TO authenticated USING (auth.uid() = user_id).
*/

-- ─── 1. est_tanques ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_tanques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES est_productos(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  codigo text,
  capacidad_maxima_galones numeric NOT NULL DEFAULT 0,
  nivel_actual_galones numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'activo',
  descripcion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_tanques_estacion ON est_tanques(estacion_id);
CREATE INDEX IF NOT EXISTS idx_est_tanques_user ON est_tanques(user_id);

ALTER TABLE est_tanques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_tanques_sel" ON est_tanques;
CREATE POLICY "est_tanques_sel" ON est_tanques FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tanques_ins" ON est_tanques;
CREATE POLICY "est_tanques_ins" ON est_tanques FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tanques_upd" ON est_tanques;
CREATE POLICY "est_tanques_upd" ON est_tanques FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tanques_del" ON est_tanques;
CREATE POLICY "est_tanques_del" ON est_tanques FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 2. est_inventario_diario ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_inventario_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  tanque_id uuid NOT NULL REFERENCES est_tanques(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL DEFAULT 'inicial',
  nivel_galones numeric NOT NULL DEFAULT 0,
  responsable text,
  hora time,
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_inv_diario_estacion ON est_inventario_diario(estacion_id, fecha);
CREATE INDEX IF NOT EXISTS idx_est_inv_diario_tanque ON est_inventario_diario(tanque_id, fecha);

ALTER TABLE est_inventario_diario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_inv_diario_sel" ON est_inventario_diario;
CREATE POLICY "est_inv_diario_sel" ON est_inventario_diario FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_inv_diario_ins" ON est_inventario_diario;
CREATE POLICY "est_inv_diario_ins" ON est_inventario_diario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_inv_diario_upd" ON est_inventario_diario;
CREATE POLICY "est_inv_diario_upd" ON est_inventario_diario FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_inv_diario_del" ON est_inventario_diario;
CREATE POLICY "est_inv_diario_del" ON est_inventario_diario FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 3. est_carrotanques ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_carrotanques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  tanque_id uuid NOT NULL REFERENCES est_tanques(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES est_productos(id) ON DELETE SET NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time,
  proveedor text,
  numero_factura text,
  numero_carrotanque text,
  conductor text,
  tipo_combustible text,
  cantidad_galones numeric NOT NULL DEFAULT 0,
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_carrotanques_estacion ON est_carrotanques(estacion_id, fecha);
CREATE INDEX IF NOT EXISTS idx_est_carrotanques_tanque ON est_carrotanques(tanque_id);

ALTER TABLE est_carrotanques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_carrotanques_sel" ON est_carrotanques;
CREATE POLICY "est_carrotanques_sel" ON est_carrotanques FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_carrotanques_ins" ON est_carrotanques;
CREATE POLICY "est_carrotanques_ins" ON est_carrotanques FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_carrotanques_upd" ON est_carrotanques;
CREATE POLICY "est_carrotanques_upd" ON est_carrotanques FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_carrotanques_del" ON est_carrotanques;
CREATE POLICY "est_carrotanques_del" ON est_carrotanques FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 4. est_movimientos_inventario ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_movimientos_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  tanque_id uuid NOT NULL REFERENCES est_tanques(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES est_productos(id) ON DELETE SET NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time,
  tipo text NOT NULL DEFAULT 'salida',
  concepto text NOT NULL DEFAULT 'venta',
  galones numeric NOT NULL DEFAULT 0,
  nivel_anterior numeric NOT NULL DEFAULT 0,
  nivel_posterior numeric NOT NULL DEFAULT 0,
  responsable text,
  turno_id uuid REFERENCES est_turnos(id) ON DELETE SET NULL,
  carrotanque_id uuid REFERENCES est_carrotanques(id) ON DELETE SET NULL,
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_mov_inv_estacion ON est_movimientos_inventario(estacion_id, fecha);
CREATE INDEX IF NOT EXISTS idx_est_mov_inv_tanque ON est_movimientos_inventario(tanque_id, fecha);

ALTER TABLE est_movimientos_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_mov_inv_sel" ON est_movimientos_inventario;
CREATE POLICY "est_mov_inv_sel" ON est_movimientos_inventario FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mov_inv_ins" ON est_movimientos_inventario;
CREATE POLICY "est_mov_inv_ins" ON est_movimientos_inventario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mov_inv_upd" ON est_movimientos_inventario;
CREATE POLICY "est_mov_inv_upd" ON est_movimientos_inventario FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mov_inv_del" ON est_movimientos_inventario;
CREATE POLICY "est_mov_inv_del" ON est_movimientos_inventario FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 5. est_precios_combustible ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_precios_combustible (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES est_productos(id) ON DELETE CASCADE,
  precio_galon numeric NOT NULL DEFAULT 0,
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_precios_estacion ON est_precios_combustible(estacion_id, activo);
CREATE INDEX IF NOT EXISTS idx_est_precios_producto ON est_precios_combustible(producto_id, activo);

ALTER TABLE est_precios_combustible ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_precios_sel" ON est_precios_combustible;
CREATE POLICY "est_precios_sel" ON est_precios_combustible FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_precios_ins" ON est_precios_combustible;
CREATE POLICY "est_precios_ins" ON est_precios_combustible FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_precios_upd" ON est_precios_combustible;
CREATE POLICY "est_precios_upd" ON est_precios_combustible FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_precios_del" ON est_precios_combustible;
CREATE POLICY "est_precios_del" ON est_precios_combustible FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 6. est_alertas_inventario ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_alertas_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  tanque_id uuid REFERENCES est_tanques(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'bajo',
  severidad text NOT NULL DEFAULT 'media',
  mensaje text NOT NULL,
  valor_actual numeric,
  umbral numeric,
  fecha timestamptz NOT NULL DEFAULT now(),
  atendida boolean NOT NULL DEFAULT false,
  atendida_por text,
  atendida_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_alertas_estacion ON est_alertas_inventario(estacion_id, atendida);
CREATE INDEX IF NOT EXISTS idx_est_alertas_fecha ON est_alertas_inventario(fecha DESC);

ALTER TABLE est_alertas_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_alertas_sel" ON est_alertas_inventario;
CREATE POLICY "est_alertas_sel" ON est_alertas_inventario FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_alertas_ins" ON est_alertas_inventario;
CREATE POLICY "est_alertas_ins" ON est_alertas_inventario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_alertas_upd" ON est_alertas_inventario;
CREATE POLICY "est_alertas_upd" ON est_alertas_inventario FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_alertas_del" ON est_alertas_inventario;
CREATE POLICY "est_alertas_del" ON est_alertas_inventario FOR DELETE TO authenticated USING (auth.uid() = user_id);
