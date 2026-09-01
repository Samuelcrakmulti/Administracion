/*
# Add import tracking columns to est_carrotanques

1. Modified Tables
- `est_carrotanques` — Added `import_batch_id` (uuid, nullable) and `source` (text, default 'native') columns
  to track which records came from Excel imports vs native entry.

2. Notes
- No data loss: both columns are nullable/have defaults.
- import_batch_id links to est_import_batches for rollback capability.
*/

ALTER TABLE est_carrotanques
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'native';

CREATE INDEX IF NOT EXISTS idx_est_carrotanques_import_batch ON est_carrotanques(import_batch_id) WHERE import_batch_id IS NOT NULL;
