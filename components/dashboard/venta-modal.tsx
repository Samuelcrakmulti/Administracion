'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2, ShoppingCart, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Producto = {
  id: string;
  nombre: string;
  codigo: string;
  precio_venta: number;
  cantidad: number;
  stock_minimo: number;
};

type ItemLine = {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock: number;
  subtotal: number;
};

const metodosPago = ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'];

export function VentaModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (stockBajos: { nombre: string; cantidad: number; stock_minimo: number }[]) => void;
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cliente, setCliente] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<ItemLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingProductos, setFetchingProductos] = useState(false);

  useEffect(() => {
    if (open) {
      setCliente('');
      setMetodoPago('Efectivo');
      setFecha(new Date().toISOString().slice(0, 10));
      setItems([]);
      setError('');
      fetchProductos();
    }
  }, [open]);

  const fetchProductos = async () => {
    setFetchingProductos(true);
    const { data } = await supabase
      .from('inventario')
      .select('id, nombre, codigo, precio_venta, cantidad, stock_minimo')
      .gt('cantidad', 0)
      .order('nombre', { ascending: true });
    setProductos((data as Producto[]) || []);
    setFetchingProductos(false);
  };

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const addProduct = (productoId: string) => {
    if (!productoId) return;
    if (items.some((i) => i.producto_id === productoId)) return;
    const p = productos.find((p) => p.id === productoId);
    if (!p) return;
    setItems((prev) => [
      ...prev,
      {
        producto_id: p.id,
        nombre: p.nombre,
        precio_unitario: Number(p.precio_venta),
        cantidad: 1,
        stock: p.cantidad,
        subtotal: Number(p.precio_venta),
      },
    ]);
  };

  const updateCantidad = (productoId: string, cantidad: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.producto_id !== productoId) return i;
        const qty = Math.max(1, Math.min(cantidad, i.stock));
        return { ...i, cantidad: qty, subtotal: i.precio_unitario * qty };
      })
    );
  };

  const removeItem = (productoId: string) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== productoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cliente.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    if (items.length === 0) {
      setError('Agrega al menos un producto a la venta.');
      return;
    }

    setLoading(true);

    const itemsJson = items.map((i) => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal,
    }));

    const { data, error: rpcError } = await supabase.rpc('registrar_venta', {
      p_cliente: cliente.trim(),
      p_metodo_pago: metodoPago,
      p_fecha: fecha,
      p_items: itemsJson,
    });

    if (rpcError) {
      setError(rpcError.message || 'Error al registrar la venta.');
      setLoading(false);
      return;
    }

    // Check for low-stock products after sale
    const vendidoIds = items.map((i) => i.producto_id);
    const { data: updatedProductos } = await supabase
      .from('inventario')
      .select('nombre, cantidad, stock_minimo')
      .in('id', vendidoIds);

    const stockBajos = (updatedProductos || [])
      .filter((p: any) => p.cantidad <= p.stock_minimo)
      .map((p: any) => ({ nombre: p.nombre, cantidad: p.cantidad, stock_minimo: p.stock_minimo }));

    setLoading(false);
    onSaved(stockBajos);
    onOpenChange(false);
  };

  const availableProductos = productos.filter(
    (p) => !items.some((i) => i.producto_id === p.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva venta</DialogTitle>
          <DialogDescription>
            Registra una nueva venta. Los productos se descontarán del
            inventario automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente + Metodo + Fecha */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metodosPago.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha-venta">Fecha</Label>
              <Input
                id="fecha-venta"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-2">
            <Label>Productos</Label>
            {fetchingProductos ? (
              <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando inventario...
              </div>
            ) : productos.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                <Package className="h-4 w-4" />
                No hay productos con stock disponible en el inventario.
              </div>
            ) : (
              <Select onValueChange={addProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto para agregar" />
                </SelectTrigger>
                <SelectContent>
                  {availableProductos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} — {p.codigo} (Stock: {p.cantidad})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Producto</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Precio</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Cantidad</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.producto_id}>
                        <td className="px-3 py-2">
                          <p className="text-sm font-medium text-slate-900">{item.nombre}</p>
                          <p className="text-xs text-slate-400">Stock: {item.stock}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-slate-600">
                          ${item.precio_unitario.toLocaleString('es-CO')}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.cantidad}
                            onChange={(e) =>
                              updateCantidad(item.producto_id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                          ${item.subtotal.toLocaleString('es-CO')}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.producto_id)}
                            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total */}
          {items.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">Total de la venta</span>
              <span className="text-xl font-bold text-slate-900">
                ${total.toLocaleString('es-CO')}
              </span>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-4 w-4" />
              )}
              Registrar venta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
