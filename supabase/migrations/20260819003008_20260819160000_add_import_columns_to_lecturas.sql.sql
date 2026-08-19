/*
# Add missing columns to est_lecturas for historical import support

1. Modified Tables
- `est_lecturas` — Add columns needed by the import wizard:
  - fecha (date, nullable) — the operational date of the reading (distinct from created_at which is the system timestamp)
  - turno (text, nullable) — shift identifier (e.g. "1", "2", "3")
  - precio_unitario (numeric, nullable) — price per gallon at time of reading
  - empleado (text, nullable) — employee name/identifier who recorded the reading

2. Security
- No RLS changes needed (existing policies still apply)

3. Important Notes
- These columns are nullable so existing records are not affected
- `fecha` allows imported historical data to have the correct operational date
- `created_at` remains as the system timestamp for when the record was inserted
- `turno` is text to accommodate various shift naming conventions from Excel files
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'est_lecturas' AND column_name = 'fecha') THEN
    ALTER TABLE est_lecturas ADD COLUMN fecha date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'est_lecturas' AND column_name = 'turno') THEN
    ALTER TABLE est_lecturas ADD COLUMN turno text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'est_lecturas' AND column_name = 'precio_unitario') THEN
    ALTER TABLE est_lecturas ADD COLUMN precio_unitario numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'est_lecturas' AND column_name = 'empleado') THEN
    ALTER TABLE est_lecturas ADD COLUMN empleado text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_est_lecturas_fecha ON est_lecturas(fecha) WHERE fecha IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_est_lecturas_estacion_fecha ON est_lecturas(estacion_id, fecha) WHERE fecha IS NOT NULL;
