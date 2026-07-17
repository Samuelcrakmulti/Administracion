/*
# Parqueadero Inteligente por Estación de Servicio

## Objetivo
Agregar `estacion_id` a las 3 tablas de parqueadero para que cada estación tenga
su propio parqueadero independiente (config, tarifas, registros).
También se agregan nuevos campos de configuración de espacios por tipo.

## Seguridad
- No se eliminan columnas ni tablas.
- Las columnas nuevas son nullable para compatibilidad.
- Se actualizan constraints UNIQUE de (user_id) a (user_id, estacion_id).
- RLS ya habilitado, políticas existentes siguen con auth.uid() = user_id.
*/

-- ─── parqueadero_config ──────────────────────────────────────────────────────
ALTER TABLE parqueadero_config ADD COLUMN IF NOT EXISTS estacion_id uuid REFERENCES estaciones(id) ON DELETE CASCADE;
ALTER TABLE parqueadero_config ADD COLUMN IF NOT EXISTS cupos_carros integer NOT NULL DEFAULT 30;
ALTER TABLE parqueadero_config ADD COLUMN IF NOT EXISTS cupos_motos integer NOT NULL DEFAULT 10;
ALTER TABLE parqueadero_config ADD COLUMN IF NOT EXISTS cupos_especiales integer NOT NULL DEFAULT 5;
ALTER TABLE parqueadero_config ADD COLUMN IF NOT EXISTS cupos_discapacitados integer NOT NULL DEFAULT 3;
ALTER TABLE parqueadero_config ADD COLUMN IF NOT EXISTS cupos_empleados integer NOT NULL DEFAULT 2;

-- Drop old unique(user_id) and replace with unique(user_id, estacion_id)
ALTER TABLE parqueadero_config DROP CONSTRAINT IF EXISTS parqueadero_config_user_id_key;
ALTER TABLE parqueadero_config DROP CONSTRAINT IF EXISTS parq_config_user_est_unique;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parq_config_user_est_unique') THEN
    ALTER TABLE parqueadero_config ADD CONSTRAINT parq_config_user_est_unique UNIQUE (user_id, estacion_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parq_config_estacion ON parqueadero_config(estacion_id);

-- ─── parqueadero_tarifas ─────────────────────────────────────────────────────
ALTER TABLE parqueadero_tarifas ADD COLUMN IF NOT EXISTS estacion_id uuid REFERENCES estaciones(id) ON DELETE CASCADE;

-- Drop old unique(user_id, tipo_vehiculo) and replace with unique(user_id, estacion_id, tipo_vehiculo)
ALTER TABLE parqueadero_tarifas DROP CONSTRAINT IF EXISTS parqueadero_tarifas_user_id_tipo_vehiculo_key;
ALTER TABLE parqueadero_tarifas DROP CONSTRAINT IF EXISTS parq_tarifas_user_est_tipo_unique;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parq_tarifas_user_est_tipo_unique') THEN
    ALTER TABLE parqueadero_tarifas ADD CONSTRAINT parq_tarifas_user_est_tipo_unique UNIQUE (user_id, estacion_id, tipo_vehiculo);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parq_tarifas_estacion ON parqueadero_tarifas(estacion_id);

-- ─── parqueadero_registros ────────────────────────────────────────────────────
ALTER TABLE parqueadero_registros ADD COLUMN IF NOT EXISTS estacion_id uuid REFERENCES estaciones(id) ON DELETE CASCADE;
ALTER TABLE parqueadero_registros ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE parqueadero_registros ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE parqueadero_registros ADD COLUMN IF NOT EXISTS responsable text;

CREATE INDEX IF NOT EXISTS idx_parq_registros_estacion ON parqueadero_registros(estacion_id);
