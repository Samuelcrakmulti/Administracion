/*
# Create AI query history table

1. New Tables
- `est_consultas_ia` — Stores user queries to the AI assistant for history and re-query.
  Columns:
  - id (uuid PK)
  - user_id (uuid, defaults to auth.uid())
  - estacion_id (uuid, nullable — null means "all stations")
  - pregunta (text, the user's question)
  - respuesta (text, the AI's response)
  - periodo (text, the period key used)
  - created_at (timestamptz)

2. Security
- RLS enabled, owner-scoped CRUD for authenticated users.
- user_id defaults to auth.uid().
*/

CREATE TABLE IF NOT EXISTS est_consultas_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  estacion_id uuid,
  pregunta text NOT NULL,
  respuesta text,
  periodo text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_est_consultas_ia_user
  ON est_consultas_ia(user_id, created_at DESC);

ALTER TABLE est_consultas_ia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_consultas_ia" ON est_consultas_ia;
CREATE POLICY "select_own_consultas_ia" ON est_consultas_ia
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_consultas_ia" ON est_consultas_ia;
CREATE POLICY "insert_own_consultas_ia" ON est_consultas_ia
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_consultas_ia" ON est_consultas_ia;
CREATE POLICY "delete_own_consultas_ia" ON est_consultas_ia
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
