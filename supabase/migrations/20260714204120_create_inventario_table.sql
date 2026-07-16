/*
# Create inventario table for user product management

1. New Tables
- `inventario`
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (uuid, foreign key to auth.users, NOT NULL, defaults to auth.uid())
  - `nombre` (text, NOT NULL — product name)
  - `categoria` (text, NOT NULL — product category)
  - `descripcion` (text, NOT NULL — product description)
  - `codigo` (text, NOT NULL — unique product code per user)
  - `precio_compra` (numeric(12,2), NOT NULL — purchase price)
  - `precio_venta` (numeric(12,2), NOT NULL — sale price)
  - `cantidad` (integer, NOT NULL, defaults to 0 — stock quantity)
  - `stock_minimo` (integer, NOT NULL, defaults to 0 — minimum stock threshold)
  - `proveedor` (text, NOT NULL — supplier name)
  - `imagen_url` (text, nullable — optional product image URL)
  - `created_at` (timestamptz, defaults to now())

2. Security
- Enable RLS on `inventario`.
- Owner-scoped CRUD: each authenticated user can only access their own products.
- 4 separate policies (SELECT, INSERT, UPDATE, DELETE) scoped to `TO authenticated` with `auth.uid() = user_id` ownership checks.
- `user_id` has `DEFAULT auth.uid()` so inserts that omit the column still satisfy the INSERT WITH CHECK constraint.

3. Indexes
- Index on `user_id` for fast per-user queries.
- Unique constraint on (user_id, codigo) to prevent duplicate codes per user.

4. Notes
- The frontend will insert products passing all fields except user_id (auto-filled by DEFAULT).
- All data is scoped to the authenticated user via RLS — no cross-user access.
- codigo uniqueness is per-user (not global), so two users can have the same product code.
*/

CREATE TABLE IF NOT EXISTS inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  categoria text NOT NULL,
  descripcion text NOT NULL,
  codigo text NOT NULL,
  precio_compra numeric(12,2) NOT NULL,
  precio_venta numeric(12,2) NOT NULL,
  cantidad integer NOT NULL DEFAULT 0,
  stock_minimo integer NOT NULL DEFAULT 0,
  proveedor text NOT NULL,
  imagen_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_inventario_user_id ON inventario(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventario_user_codigo ON inventario(user_id, codigo);

DROP POLICY IF EXISTS "select_own_inventario" ON inventario;
CREATE POLICY "select_own_inventario" ON inventario FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_inventario" ON inventario;
CREATE POLICY "insert_own_inventario" ON inventario FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_inventario" ON inventario;
CREATE POLICY "update_own_inventario" ON inventario FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_inventario" ON inventario;
CREATE POLICY "delete_own_inventario" ON inventario FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
