/*
# Fase 3 – Entrega y Aprobación de Turnos
Agrega columnas de auditoría a est_turnos para soportar el flujo:
  abierto → pendiente_aprobacion → (cerrado | con_diferencia | en_revision)
*/

-- Nuevas columnas de auditoría en est_turnos
ALTER TABLE est_turnos
  ADD COLUMN IF NOT EXISTS aprobado_por          text,
  ADD COLUMN IF NOT EXISTS aprobado_at           timestamptz,
  ADD COLUMN IF NOT EXISTS rechazado_por         text,
  ADD COLUMN IF NOT EXISTS rechazado_at          timestamptz,
  ADD COLUMN IF NOT EXISTS supervisor_observaciones text,
  ADD COLUMN IF NOT EXISTS total_galones         numeric  -- alias para UI (mismo valor que total_litros, solo etiqueta)
;

-- Índice para panel de aprobación (turnos pendientes por estación)
CREATE INDEX IF NOT EXISTS idx_est_turnos_estado_est
  ON est_turnos(estacion_id, estado)
  WHERE estado IN ('pendiente_aprobacion', 'en_revision');
