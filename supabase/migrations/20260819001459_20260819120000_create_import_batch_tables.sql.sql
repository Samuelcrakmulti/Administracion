/*
# Create import batch tracking tables for historical data import

1. New Tables
- `est_import_batches` — Tracks each import operation (file, user, station, type, counts, status)
  - id (uuid PK)
  - user_email (text, who performed the import)
  - estacion_id (uuid, FK to estaciones)
  - tipo_importacion (text: 'galonaje' | 'iniciales' | 'otros')
  - nombre_archivo (text, original file name)
  - tamano_archivo (bigint, file size in bytes)
  - file_hash (text, optional hash for idempotency detection)
  - hoja_seleccionada (text, which Excel sheet was imported)
  - total_filas (int, total rows detected)
  - registros_validos (int, rows that passed validation)
  - registros_importados (int, rows actually inserted)
  - registros_omitidos (int, rows skipped)
  - registros_error (int, rows with errors)
  - registros_advertencia (int, rows with warnings)
  - duplicados (int, duplicate rows detected)
  - periodo_inicio (date, earliest date in imported data)
  - periodo_fin (date, latest date in imported data)
  - estado (text: 'completado' | 'revertido' | 'error' | 'en_progreso')
  - resultado_resumen (text, human-readable summary)
  - created_at (timestamptz)
  - reverted_at (timestamptz, when rollback was executed)
  - reverted_by (text, who performed the rollback)

- `est_import_errores` — Detailed error/warning log per row
  - id (uuid PK)
  - batch_id (uuid, FK to est_import_batches ON DELETE CASCADE)
  - fila (int, row number in original file)
  - campo (text, which field had the issue)
  - valor (text, the problematic value)
  - tipo (text: 'error' | 'advertencia' | 'informacion')
  - mensaje (text, human-readable description)
  - solucion_sugerida (text, suggested fix)
  - created_at (timestamptz)

2. Modified Tables
- `est_lecturas` — Add source tracking columns
  - source (text DEFAULT 'native', 'native' or 'imported')
  - import_batch_id (uuid, nullable, FK to est_import_batches ON DELETE SET NULL)

3. Security
- Enable RLS on both new tables
- Authenticated users can manage their import batches and errors
- Authenticated users can update est_lecturas source/batch fields

4. Important Notes
- The source column on est_lecturas allows distinguishing native vs imported data
- import_batch_id on est_lecturas allows rollback by batch
- CASCADE delete on est_import_errores ensures errors are cleaned up with their batch
- SET NULL on est_lecturas.import_batch_id preserves lecturas if a batch record is deleted
*/

-- Create import batches table
CREATE TABLE IF NOT EXISTS est_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  estacion_id uuid REFERENCES estaciones(id) ON DELETE SET NULL,
  tipo_importacion text NOT NULL DEFAULT 'galonaje',
  nombre_archivo text NOT NULL,
  tamano_archivo bigint DEFAULT 0,
  file_hash text,
  hoja_seleccionada text,
  total_filas int DEFAULT 0,
  registros_validos int DEFAULT 0,
  registros_importados int DEFAULT 0,
  registros_omitidos int DEFAULT 0,
  registros_error int DEFAULT 0,
  registros_advertencia int DEFAULT 0,
  duplicados int DEFAULT 0,
  periodo_inicio date,
  periodo_fin date,
  estado text NOT NULL DEFAULT 'en_progreso',
  resultado_resumen text,
  created_at timestamptz DEFAULT now(),
  reverted_at timestamptz,
  reverted_by text
);

ALTER TABLE est_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_import_batches" ON est_import_batches;
CREATE POLICY "select_own_import_batches" ON est_import_batches FOR SELECT
  TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "insert_own_import_batches" ON est_import_batches;
CREATE POLICY "insert_own_import_batches" ON est_import_batches FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "update_own_import_batches" ON est_import_batches;
CREATE POLICY "update_own_import_batches" ON est_import_batches FOR UPDATE
  TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "delete_own_import_batches" ON est_import_batches;
CREATE POLICY "delete_own_import_batches" ON est_import_batches FOR DELETE
  TO authenticated USING (auth.uid() IS NOT NULL);

-- Create import errors table
CREATE TABLE IF NOT EXISTS est_import_errores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES est_import_batches(id) ON DELETE CASCADE,
  fila int,
  campo text,
  valor text,
  tipo text NOT NULL DEFAULT 'error',
  mensaje text NOT NULL,
  solucion_sugerida text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE est_import_errores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_import_errores" ON est_import_errores;
CREATE POLICY "select_import_errores" ON est_import_errores FOR SELECT
  TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "insert_import_errores" ON est_import_errores;
CREATE POLICY "insert_import_errores" ON est_import_errores FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "delete_import_errores" ON est_import_errores;
CREATE POLICY "delete_import_errores" ON est_import_errores FOR DELETE
  TO authenticated USING (auth.uid() IS NOT NULL);

-- Add source tracking to est_lecturas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'est_lecturas' AND column_name = 'source') THEN
    ALTER TABLE est_lecturas ADD COLUMN source text NOT NULL DEFAULT 'native';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'est_lecturas' AND column_name = 'import_batch_id') THEN
    ALTER TABLE est_lecturas ADD COLUMN import_batch_id uuid REFERENCES est_import_batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for efficient batch-based queries and rollback
CREATE INDEX IF NOT EXISTS idx_est_lecturas_import_batch ON est_lecturas(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_est_lecturas_source ON est_lecturas(source);
CREATE INDEX IF NOT EXISTS idx_est_import_batches_estacion ON est_import_batches(estacion_id);
CREATE INDEX IF NOT EXISTS idx_est_import_batches_created ON est_import_batches(created_at DESC);
