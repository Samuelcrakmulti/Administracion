/*
# Add firma and revision columns to est_turnos

1. Changes
  - `est_turnos`: add firma_vendedor (text, nullable) — placeholder for future digital signature
  - `est_turnos`: add firma_supervisor (text, nullable) — placeholder for future digital signature
  - `est_turnos`: add revisado_por (text, nullable) — who requested revision
  - `est_turnos`: add revisado_at (timestamptz, nullable) — when revision was requested

2. Notes
  - All new columns are nullable to avoid breaking existing rows
  - estado column (text) already supports any string so new states
    (pendiente_aprobacion, en_revision) work without schema change
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='est_turnos' AND column_name='firma_vendedor') THEN
    ALTER TABLE est_turnos ADD COLUMN firma_vendedor text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='est_turnos' AND column_name='firma_supervisor') THEN
    ALTER TABLE est_turnos ADD COLUMN firma_supervisor text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='est_turnos' AND column_name='revisado_por') THEN
    ALTER TABLE est_turnos ADD COLUMN revisado_por text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='est_turnos' AND column_name='revisado_at') THEN
    ALTER TABLE est_turnos ADD COLUMN revisado_at timestamptz;
  END IF;
END $$;
