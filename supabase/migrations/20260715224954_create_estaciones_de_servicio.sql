/*
# Módulo Gestión de Estaciones de Servicio
Jerarquía: Empresa → Estaciones → Islas → Surtidores → Mangueras / Productos

## Tablas
1. estaciones        — Una o varias estaciones por usuario
2. est_islas         — Islas físicas dentro de una estación
3. est_surtidores    — Surtidores/dispensadores dentro de una isla
4. est_mangueras     — Mangueras dentro de un surtidor
5. est_productos     — Catálogo de combustibles/productos configurables por usuario

## Claves foráneas
- est_islas.estacion_id → estaciones
- est_surtidores.isla_id → est_islas; est_surtidores.estacion_id → estaciones (acceso rápido)
- est_mangueras.surtidor_id → est_surtidores; isla_id → est_islas; estacion_id → estaciones
- est_mangueras.producto_id → est_productos (nullable)

## Seguridad
RLS habilitado en las 5 tablas.
4 políticas separadas (SELECT, INSERT, UPDATE, DELETE) por tabla.
Todas scoped TO authenticated USING (auth.uid() = user_id).
DEFAULT auth.uid() en user_id para inserts sin el campo.
*/

-- ─── 1. est_productos ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  codigo text,
  color text NOT NULL DEFAULT '#3B82F6',
  precio_litro numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'Litro',
  estado text NOT NULL DEFAULT 'activo',
  descripcion text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_prod_user ON est_productos(user_id);

ALTER TABLE est_productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_prod_sel" ON est_productos;
CREATE POLICY "est_prod_sel" ON est_productos FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_prod_ins" ON est_productos;
CREATE POLICY "est_prod_ins" ON est_productos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_prod_upd" ON est_productos;
CREATE POLICY "est_prod_upd" ON est_productos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_prod_del" ON est_productos;
CREATE POLICY "est_prod_del" ON est_productos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 2. estaciones ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  empresa text,
  ciudad text,
  departamento text,
  direccion text,
  telefono text,
  correo text,
  administrador text,
  estado text NOT NULL DEFAULT 'activa',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estaciones_user ON estaciones(user_id);

ALTER TABLE estaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_sel" ON estaciones;
CREATE POLICY "est_sel" ON estaciones FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_ins" ON estaciones;
CREATE POLICY "est_ins" ON estaciones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_upd" ON estaciones;
CREATE POLICY "est_upd" ON estaciones FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_del" ON estaciones;
CREATE POLICY "est_del" ON estaciones FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 3. est_islas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_islas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  codigo text,
  descripcion text,
  estado text NOT NULL DEFAULT 'activa',
  color text NOT NULL DEFAULT '#3B82F6',
  orden int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_islas_estacion ON est_islas(estacion_id);

ALTER TABLE est_islas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_islas_sel" ON est_islas;
CREATE POLICY "est_islas_sel" ON est_islas FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_islas_ins" ON est_islas;
CREATE POLICY "est_islas_ins" ON est_islas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_islas_upd" ON est_islas;
CREATE POLICY "est_islas_upd" ON est_islas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_islas_del" ON est_islas;
CREATE POLICY "est_islas_del" ON est_islas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 4. est_surtidores ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_surtidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  isla_id uuid NOT NULL REFERENCES est_islas(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  numero int NOT NULL DEFAULT 1,
  nombre text NOT NULL,
  codigo text,
  marca text,
  modelo text,
  serie text,
  estado text NOT NULL DEFAULT 'activo',
  fecha_instalacion date,
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_surt_isla ON est_surtidores(isla_id);
CREATE INDEX IF NOT EXISTS idx_est_surt_estacion ON est_surtidores(estacion_id);

ALTER TABLE est_surtidores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_surt_sel" ON est_surtidores;
CREATE POLICY "est_surt_sel" ON est_surtidores FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_surt_ins" ON est_surtidores;
CREATE POLICY "est_surt_ins" ON est_surtidores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_surt_upd" ON est_surtidores;
CREATE POLICY "est_surt_upd" ON est_surtidores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_surt_del" ON est_surtidores;
CREATE POLICY "est_surt_del" ON est_surtidores FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 5. est_mangueras ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS est_mangueras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  surtidor_id uuid NOT NULL REFERENCES est_surtidores(id) ON DELETE CASCADE,
  isla_id uuid NOT NULL REFERENCES est_islas(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  numero int NOT NULL DEFAULT 1,
  nombre text NOT NULL,
  producto_id uuid REFERENCES est_productos(id) ON DELETE SET NULL,
  color text NOT NULL DEFAULT '#94a3b8',
  estado text NOT NULL DEFAULT 'activa',
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_mang_surtidor ON est_mangueras(surtidor_id);
CREATE INDEX IF NOT EXISTS idx_est_mang_estacion ON est_mangueras(estacion_id);

ALTER TABLE est_mangueras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_mang_sel" ON est_mangueras;
CREATE POLICY "est_mang_sel" ON est_mangueras FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mang_ins" ON est_mangueras;
CREATE POLICY "est_mang_ins" ON est_mangueras FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mang_upd" ON est_mangueras;
CREATE POLICY "est_mang_upd" ON est_mangueras FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "est_mang_del" ON est_mangueras;
CREATE POLICY "est_mang_del" ON est_mangueras FOR DELETE TO authenticated USING (auth.uid() = user_id);
