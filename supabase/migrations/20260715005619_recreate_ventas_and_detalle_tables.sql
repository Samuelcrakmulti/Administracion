/*
# Recreate ventas table with correct schema + create detalle_venta + RPC functions

The previous `ventas` table had an outdated schema (empresa_id, monto, descripcion).
It contained no real user data, so we drop and recreate it with the correct columns.

## 1. New Tables
- `ventas` (recreated): id, user_id, cliente, total, metodo_pago, estado, fecha, created_at
- `detalle_venta`: id, venta_id, producto_id, cantidad, precio_unitario, subtotal, created_at

## 2. Modified Tables
- `finanzas`: add `venta_id` column (nullable FK to ventas ON DELETE SET NULL)

## 3. Security
- RLS on both tables with owner-scoped policies

## 4. RPC Functions
- `registrar_venta`: atomic sale + stock decrement + finanzas ingreso
- `eliminar_venta`: atomic sale deletion + stock restoration + finanzas cleanup
*/

-- Drop old ventas table (no real data, outdated schema)
DROP TABLE IF EXISTS detalle_venta CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;

-- ─── ventas ──────────────────────────────────────────────
CREATE TABLE ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente text NOT NULL,
  total numeric(12,2) NOT NULL,
  metodo_pago text NOT NULL,
  estado text NOT NULL DEFAULT 'Completada',
  fecha date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ventas_user_id ON ventas(user_id);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);

CREATE POLICY "select_own_ventas" ON ventas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_ventas" ON ventas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_ventas" ON ventas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_ventas" ON ventas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ─── detalle_venta ───────────────────────────────────────
CREATE TABLE detalle_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES inventario(id),
  cantidad integer NOT NULL,
  precio_unitario numeric(12,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE detalle_venta ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_detalle_venta_venta_id ON detalle_venta(venta_id);
CREATE INDEX idx_detalle_venta_producto_id ON detalle_venta(producto_id);

CREATE POLICY "select_own_detalle" ON detalle_venta FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM ventas WHERE ventas.id = detalle_venta.venta_id AND ventas.user_id = auth.uid())
  );

CREATE POLICY "insert_own_detalle" ON detalle_venta FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM ventas WHERE ventas.id = detalle_venta.venta_id AND ventas.user_id = auth.uid())
  );

CREATE POLICY "update_own_detalle" ON detalle_venta FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM ventas WHERE ventas.id = detalle_venta.venta_id AND ventas.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM ventas WHERE ventas.id = detalle_venta.venta_id AND ventas.user_id = auth.uid())
  );

CREATE POLICY "delete_own_detalle" ON detalle_venta FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM ventas WHERE ventas.id = detalle_venta.venta_id AND ventas.user_id = auth.uid())
  );

-- ─── finanzas: add venta_id column ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finanzas' AND column_name = 'venta_id'
  ) THEN
    ALTER TABLE finanzas ADD COLUMN venta_id uuid REFERENCES ventas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── RPC: registrar_venta ────────────────────────────────
CREATE OR REPLACE FUNCTION registrar_venta(
  p_cliente text,
  p_metodo_pago text,
  p_fecha date,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta_id uuid;
  v_total numeric(12,2) := 0;
  item jsonb;
  v_producto_id uuid;
  v_cantidad int;
  v_precio numeric(12,2);
  v_subtotal numeric(12,2);
  v_current_stock int;
  v_current_user uuid := auth.uid();
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  FOR item IN SELECT jsonb_array_elements(p_items)
  LOOP
    v_subtotal := (item->>'subtotal')::numeric(12,2);
    v_total := v_total + v_subtotal;
  END LOOP;

  INSERT INTO ventas (user_id, cliente, total, metodo_pago, estado, fecha)
  VALUES (v_current_user, p_cliente, v_total, p_metodo_pago, 'Completada', p_fecha)
  RETURNING id INTO v_venta_id;

  FOR item IN SELECT jsonb_array_elements(p_items)
  LOOP
    v_producto_id := (item->>'producto_id')::uuid;
    v_cantidad := (item->>'cantidad')::int;
    v_precio := (item->>'precio_unitario')::numeric(12,2);
    v_subtotal := (item->>'subtotal')::numeric(12,2);

    SELECT cantidad INTO v_current_stock
    FROM inventario
    WHERE id = v_producto_id AND user_id = v_current_user
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_producto_id;
    END IF;

    IF v_current_stock < v_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', v_current_stock, v_cantidad;
    END IF;

    INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    VALUES (v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal);

    UPDATE inventario
    SET cantidad = cantidad - v_cantidad
    WHERE id = v_producto_id AND user_id = v_current_user;
  END LOOP;

  INSERT INTO finanzas (user_id, tipo, categoria, descripcion, valor, fecha, venta_id)
  VALUES (
    v_current_user,
    'Ingreso',
    'Ventas',
    'Venta a: ' || p_cliente,
    v_total,
    p_fecha,
    v_venta_id
  );

  RETURN v_venta_id;
END;
$$;

-- ─── RPC: eliminar_venta ─────────────────────────────────
CREATE OR REPLACE FUNCTION eliminar_venta(p_venta_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user uuid := auth.uid();
  d RECORD;
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ventas WHERE id = p_venta_id AND user_id = v_current_user
  ) THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  FOR d IN
    SELECT producto_id, cantidad
    FROM detalle_venta
    WHERE venta_id = p_venta_id
  LOOP
    UPDATE inventario
    SET cantidad = cantidad + d.cantidad
    WHERE id = d.producto_id AND user_id = v_current_user;
  END LOOP;

  DELETE FROM finanzas WHERE venta_id = p_venta_id AND user_id = v_current_user;

  DELETE FROM ventas WHERE id = p_venta_id AND user_id = v_current_user;
END;
$$;
