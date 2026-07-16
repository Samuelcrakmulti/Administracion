/*
# Módulo Parqueadero Inteligente — Tablas principales

## Descripción
Crea tres tablas para el módulo de gestión de parqueadero empresarial:
parqueadero_config, parqueadero_tarifas y parqueadero_registros.

## 1. Tabla: parqueadero_config
Configuración global del parqueadero por usuario.
- id (uuid, PK)
- user_id (uuid, FK auth.users, UNIQUE — un registro por usuario)
- total_cupos (integer, default 50) — número total de espacios
- tiempo_gracia_min (integer, default 15) — minutos sin cobro al ingresar
- iva_pct (numeric, default 0) — porcentaje de IVA aplicado
- horario_apertura (time, default 06:00)
- horario_cierre (time, default 22:00)
- updated_at (timestamptz)

## 2. Tabla: parqueadero_tarifas
Tarifas por tipo de vehículo, una fila por tipo por usuario.
- id (uuid, PK)
- user_id (uuid, FK auth.users)
- tipo_vehiculo (text) — automovil | motocicleta | bicicleta | camioneta | camion
- tarifa_primera_hora (numeric)
- tarifa_hora_adicional (numeric)
- tarifa_maxima_dia (numeric)
- UNIQUE(user_id, tipo_vehiculo)

## 3. Tabla: parqueadero_registros
Registro completo de cada vehículo (entrada + salida + pago).
- id (uuid, PK)
- user_id (uuid, FK auth.users, default auth.uid())
- placa (text, NOT NULL)
- tipo_vehiculo (text, NOT NULL)
- nombre_conductor, documento, telefono, espacio, observaciones (text, nullable)
- hora_ingreso (timestamptz, NOT NULL, default now())
- hora_salida (timestamptz, nullable) — null mientras está activo
- tiempo_minutos (integer, nullable) — calculado al registrar salida
- subtotal, descuento, iva, total (numeric, nullable) — calculados al pago
- metodo_pago (text, nullable) — efectivo | tarjeta | qr | transferencia
- estado (text, default 'activo') — activo | pagado | anulado
- finanza_id (uuid, FK finanzas.id, nullable) — ingreso financiero creado al pago

## 4. Seguridad
RLS habilitado en las 3 tablas.
4 políticas separadas (SELECT, INSERT, UPDATE, DELETE) por tabla.
Scoped a TO authenticated con auth.uid() = user_id.
*/

-- =============================================
-- 1. parqueadero_config
-- =============================================
CREATE TABLE IF NOT EXISTS parqueadero_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  total_cupos integer NOT NULL DEFAULT 50,
  tiempo_gracia_min integer NOT NULL DEFAULT 15,
  iva_pct numeric NOT NULL DEFAULT 0,
  horario_apertura time NOT NULL DEFAULT '06:00',
  horario_cierre time NOT NULL DEFAULT '22:00',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE parqueadero_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parq_config_select" ON parqueadero_config;
CREATE POLICY "parq_config_select" ON parqueadero_config FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_config_insert" ON parqueadero_config;
CREATE POLICY "parq_config_insert" ON parqueadero_config FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_config_update" ON parqueadero_config;
CREATE POLICY "parq_config_update" ON parqueadero_config FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_config_delete" ON parqueadero_config;
CREATE POLICY "parq_config_delete" ON parqueadero_config FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- 2. parqueadero_tarifas
-- =============================================
CREATE TABLE IF NOT EXISTS parqueadero_tarifas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_vehiculo text NOT NULL,
  tarifa_primera_hora numeric NOT NULL DEFAULT 3000,
  tarifa_hora_adicional numeric NOT NULL DEFAULT 2000,
  tarifa_maxima_dia numeric NOT NULL DEFAULT 25000,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tipo_vehiculo)
);

ALTER TABLE parqueadero_tarifas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parq_tarifas_select" ON parqueadero_tarifas;
CREATE POLICY "parq_tarifas_select" ON parqueadero_tarifas FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_tarifas_insert" ON parqueadero_tarifas;
CREATE POLICY "parq_tarifas_insert" ON parqueadero_tarifas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_tarifas_update" ON parqueadero_tarifas;
CREATE POLICY "parq_tarifas_update" ON parqueadero_tarifas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_tarifas_delete" ON parqueadero_tarifas;
CREATE POLICY "parq_tarifas_delete" ON parqueadero_tarifas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- 3. parqueadero_registros
-- =============================================
CREATE TABLE IF NOT EXISTS parqueadero_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  placa text NOT NULL,
  tipo_vehiculo text NOT NULL,
  nombre_conductor text,
  documento text,
  telefono text,
  espacio text,
  observaciones text,
  hora_ingreso timestamptz NOT NULL DEFAULT now(),
  hora_salida timestamptz,
  tiempo_minutos integer,
  subtotal numeric,
  descuento numeric DEFAULT 0,
  iva numeric DEFAULT 0,
  total numeric,
  metodo_pago text,
  estado text NOT NULL DEFAULT 'activo',
  finanza_id uuid REFERENCES finanzas(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parq_registros_user_estado ON parqueadero_registros(user_id, estado);
CREATE INDEX IF NOT EXISTS idx_parq_registros_hora_ingreso ON parqueadero_registros(hora_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_parq_registros_placa ON parqueadero_registros(placa);

ALTER TABLE parqueadero_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parq_registros_select" ON parqueadero_registros;
CREATE POLICY "parq_registros_select" ON parqueadero_registros FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_registros_insert" ON parqueadero_registros;
CREATE POLICY "parq_registros_insert" ON parqueadero_registros FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_registros_update" ON parqueadero_registros;
CREATE POLICY "parq_registros_update" ON parqueadero_registros FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parq_registros_delete" ON parqueadero_registros;
CREATE POLICY "parq_registros_delete" ON parqueadero_registros FOR DELETE TO authenticated USING (auth.uid() = user_id);
