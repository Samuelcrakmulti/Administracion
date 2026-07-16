/*
# Módulo Gestión de Talento Humano — 5 tablas

## 1. rrhh_empleados
Registro completo de cada empleado.
Columnas: id, user_id, nombre, apellido, cargo, documento, email, telefono, direccion,
  fecha_nacimiento, fecha_ingreso, tipo_contrato, salario, comision_pct, jefe_id (self-ref),
  estado (activo|vacaciones|licencia|incapacidad|retirado), foto_url,
  eps, arl, banco, numero_cuenta,
  contacto_emergencia_nombre, contacto_emergencia_telefono, observaciones, created_at.

## 2. rrhh_turnos
Asignación de turnos diarios a empleados.
Columnas: id, user_id, empleado_id (FK), fecha, hora_inicio, hora_fin,
  tipo (manana|tarde|noche|descanso), observaciones, created_at.

## 3. rrhh_asistencia
Registro diario de asistencia (entrada/salida).
Columnas: id, user_id, empleado_id (FK), fecha, hora_entrada, hora_salida,
  horas_trabajadas, estado (a_tiempo|tarde|ausente), observaciones, created_at.
Unique constraint: (empleado_id, fecha).

## 4. rrhh_nomina
Liquidación mensual por empleado.
Columnas: id, user_id, empleado_id (FK), mes, anio, salario_base, horas_extras,
  valor_horas_extras, bonificaciones, comisiones, descuentos, prestaciones, total,
  estado (pendiente|pagado), finanza_id (FK finanzas nullable), created_at.
Unique constraint: (empleado_id, mes, anio).

## 5. rrhh_vacaciones
Solicitudes y períodos de vacaciones.
Columnas: id, user_id, empleado_id (FK), fecha_inicio, fecha_fin, dias,
  estado (solicitado|aprobado|rechazado), observaciones, created_at.

## Seguridad
RLS habilitado en las 5 tablas.
4 políticas separadas por tabla (SELECT, INSERT, UPDATE, DELETE).
Scoped TO authenticated con auth.uid() = user_id.
DEFAULT auth.uid() en user_id para que inserts sin user_id funcionen.
*/

-- ─── 1. rrhh_empleados ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_empleados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  apellido text NOT NULL,
  cargo text NOT NULL DEFAULT '',
  documento text,
  email text,
  telefono text,
  direccion text,
  fecha_nacimiento date,
  fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE,
  tipo_contrato text NOT NULL DEFAULT 'indefinido',
  salario numeric NOT NULL DEFAULT 0,
  comision_pct numeric NOT NULL DEFAULT 0,
  jefe_id uuid REFERENCES rrhh_empleados(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'activo',
  foto_url text,
  eps text,
  arl text,
  banco text,
  numero_cuenta text,
  contacto_emergencia_nombre text,
  contacto_emergencia_telefono text,
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rrhh_emp_user ON rrhh_empleados(user_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_emp_estado ON rrhh_empleados(estado);

ALTER TABLE rrhh_empleados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rrhh_emp_sel" ON rrhh_empleados;
CREATE POLICY "rrhh_emp_sel" ON rrhh_empleados FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_emp_ins" ON rrhh_empleados;
CREATE POLICY "rrhh_emp_ins" ON rrhh_empleados FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_emp_upd" ON rrhh_empleados;
CREATE POLICY "rrhh_emp_upd" ON rrhh_empleados FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_emp_del" ON rrhh_empleados;
CREATE POLICY "rrhh_emp_del" ON rrhh_empleados FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 2. rrhh_turnos ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES rrhh_empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora_inicio time,
  hora_fin time,
  tipo text NOT NULL DEFAULT 'manana',
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rrhh_tur_fecha ON rrhh_turnos(fecha, user_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_tur_emp ON rrhh_turnos(empleado_id);

ALTER TABLE rrhh_turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rrhh_tur_sel" ON rrhh_turnos;
CREATE POLICY "rrhh_tur_sel" ON rrhh_turnos FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_tur_ins" ON rrhh_turnos;
CREATE POLICY "rrhh_tur_ins" ON rrhh_turnos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_tur_upd" ON rrhh_turnos;
CREATE POLICY "rrhh_tur_upd" ON rrhh_turnos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_tur_del" ON rrhh_turnos;
CREATE POLICY "rrhh_tur_del" ON rrhh_turnos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 3. rrhh_asistencia ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES rrhh_empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada time,
  hora_salida time,
  horas_trabajadas numeric,
  estado text NOT NULL DEFAULT 'a_tiempo',
  observaciones text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_rrhh_asis_fecha ON rrhh_asistencia(fecha, user_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_asis_emp ON rrhh_asistencia(empleado_id);

ALTER TABLE rrhh_asistencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rrhh_asis_sel" ON rrhh_asistencia;
CREATE POLICY "rrhh_asis_sel" ON rrhh_asistencia FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_asis_ins" ON rrhh_asistencia;
CREATE POLICY "rrhh_asis_ins" ON rrhh_asistencia FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_asis_upd" ON rrhh_asistencia;
CREATE POLICY "rrhh_asis_upd" ON rrhh_asistencia FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_asis_del" ON rrhh_asistencia;
CREATE POLICY "rrhh_asis_del" ON rrhh_asistencia FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 4. rrhh_nomina ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_nomina (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES rrhh_empleados(id) ON DELETE CASCADE,
  mes integer NOT NULL,
  anio integer NOT NULL,
  salario_base numeric NOT NULL DEFAULT 0,
  horas_extras numeric NOT NULL DEFAULT 0,
  valor_horas_extras numeric NOT NULL DEFAULT 0,
  bonificaciones numeric NOT NULL DEFAULT 0,
  comisiones numeric NOT NULL DEFAULT 0,
  descuentos numeric NOT NULL DEFAULT 0,
  prestaciones numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente',
  finanza_id uuid REFERENCES finanzas(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id, mes, anio)
);

CREATE INDEX IF NOT EXISTS idx_rrhh_nom_periodo ON rrhh_nomina(mes, anio, user_id);

ALTER TABLE rrhh_nomina ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rrhh_nom_sel" ON rrhh_nomina;
CREATE POLICY "rrhh_nom_sel" ON rrhh_nomina FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_nom_ins" ON rrhh_nomina;
CREATE POLICY "rrhh_nom_ins" ON rrhh_nomina FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_nom_upd" ON rrhh_nomina;
CREATE POLICY "rrhh_nom_upd" ON rrhh_nomina FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_nom_del" ON rrhh_nomina;
CREATE POLICY "rrhh_nom_del" ON rrhh_nomina FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 5. rrhh_vacaciones ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_vacaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES rrhh_empleados(id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  dias integer,
  estado text NOT NULL DEFAULT 'solicitado',
  observaciones text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rrhh_vac_emp ON rrhh_vacaciones(empleado_id);

ALTER TABLE rrhh_vacaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rrhh_vac_sel" ON rrhh_vacaciones;
CREATE POLICY "rrhh_vac_sel" ON rrhh_vacaciones FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_vac_ins" ON rrhh_vacaciones;
CREATE POLICY "rrhh_vac_ins" ON rrhh_vacaciones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_vac_upd" ON rrhh_vacaciones;
CREATE POLICY "rrhh_vac_upd" ON rrhh_vacaciones FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "rrhh_vac_del" ON rrhh_vacaciones;
CREATE POLICY "rrhh_vac_del" ON rrhh_vacaciones FOR DELETE TO authenticated USING (auth.uid() = user_id);
