/*
# Fase 2: Operación Diaria de Estaciones de Servicio
Tablas que registran la operación turno a turno.

## 1. est_turnos
Cada turno diario de trabajo: empleado, horario, estado.

## 2. est_lecturas
Una fila por manguera por turno.
Almacena lectura inicial + final (galgas del contador).
litros_vendidos y venta_total se calculan frontend y se persisten al guardar.
precio_litro se congela en el momento de crear el turno (snapshot histórico).
numero_manguera, nombre_isla, nombre_surtidor son desnormalizados para queries independientes.

## 3. est_cuadres
Cuadre de caja por turno (1-a-1 con est_turnos).
Registra cada método de pago y calcula la diferencia automáticamente.
*/

-- ─── 1. est_turnos ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  empleado text NOT NULL,
  cargo text,
  tipo_turno text NOT NULL DEFAULT 'manana',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio time NOT NULL,
  hora_fin_estimada time,
  hora_fin_real time,
  estado text NOT NULL DEFAULT 'abierto',
  total_litros numeric,
  total_ventas numeric,
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_turnos_estacion ON est_turnos(estacion_id, estado);
CREATE INDEX IF NOT EXISTS idx_est_turnos_fecha ON est_turnos(fecha, estacion_id);

ALTER TABLE est_turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_tur_sel" ON est_turnos;
CREATE POLICY "est_tur_sel" ON est_turnos FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tur_ins" ON est_turnos;
CREATE POLICY "est_tur_ins" ON est_turnos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tur_upd" ON est_turnos;
CREATE POLICY "est_tur_upd" ON est_turnos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_tur_del" ON est_turnos;
CREATE POLICY "est_tur_del" ON est_turnos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 2. est_lecturas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_lecturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  turno_id uuid NOT NULL REFERENCES est_turnos(id) ON DELETE CASCADE,
  manguera_id uuid NOT NULL REFERENCES est_mangueras(id) ON DELETE CASCADE,
  surtidor_id uuid NOT NULL REFERENCES est_surtidores(id) ON DELETE CASCADE,
  isla_id uuid NOT NULL REFERENCES est_islas(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES est_productos(id) ON DELETE SET NULL,
  -- Desnormalización para historial independiente
  nombre_manguera text NOT NULL DEFAULT '',
  numero_manguera integer NOT NULL DEFAULT 1,
  nombre_surtidor text NOT NULL DEFAULT '',
  numero_surtidor integer NOT NULL DEFAULT 1,
  nombre_isla text NOT NULL DEFAULT '',
  orden_isla integer NOT NULL DEFAULT 1,
  nombre_producto text,
  color_producto text NOT NULL DEFAULT '#94a3b8',
  precio_litro numeric NOT NULL DEFAULT 0,
  -- Lecturas
  lectura_inicial numeric,
  lectura_final numeric,
  litros_vendidos numeric,
  venta_total numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(turno_id, manguera_id)
);

CREATE INDEX IF NOT EXISTS idx_est_lect_turno ON est_lecturas(turno_id);
CREATE INDEX IF NOT EXISTS idx_est_lect_estacion ON est_lecturas(estacion_id);

ALTER TABLE est_lecturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_lect_sel" ON est_lecturas;
CREATE POLICY "est_lect_sel" ON est_lecturas FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_lect_ins" ON est_lecturas;
CREATE POLICY "est_lect_ins" ON est_lecturas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_lect_upd" ON est_lecturas;
CREATE POLICY "est_lect_upd" ON est_lecturas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_lect_del" ON est_lecturas;
CREATE POLICY "est_lect_del" ON est_lecturas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 3. est_cuadres ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_cuadres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  turno_id uuid NOT NULL REFERENCES est_turnos(id) ON DELETE CASCADE UNIQUE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  ventas_esperadas numeric NOT NULL DEFAULT 0,
  efectivo numeric NOT NULL DEFAULT 0,
  tarjetas_credito numeric NOT NULL DEFAULT 0,
  tarjetas_debito numeric NOT NULL DEFAULT 0,
  transferencias numeric NOT NULL DEFAULT 0,
  qr numeric NOT NULL DEFAULT 0,
  credito_empresas numeric NOT NULL DEFAULT 0,
  otros numeric NOT NULL DEFAULT 0,
  total_entregado numeric NOT NULL DEFAULT 0,
  diferencia numeric NOT NULL DEFAULT 0,
  resultado text NOT NULL DEFAULT 'correcto',
  observaciones_cuadre text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_cuadres_turno ON est_cuadres(turno_id);

ALTER TABLE est_cuadres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_cuad_sel" ON est_cuadres;
CREATE POLICY "est_cuad_sel" ON est_cuadres FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cuad_ins" ON est_cuadres;
CREATE POLICY "est_cuad_ins" ON est_cuadres FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cuad_upd" ON est_cuadres;
CREATE POLICY "est_cuad_upd" ON est_cuadres FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_cuad_del" ON est_cuadres;
CREATE POLICY "est_cuad_del" ON est_cuadres FOR DELETE TO authenticated USING (auth.uid() = user_id);
