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
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type Producto = {
  id: string;
  user_id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  codigo: string;
  precio_compra: number;
  precio_venta: number;
  cantidad: number;
  stock_minimo: number;
  proveedor: string;
  imagen_url: string | null;
  created_at: string;
};

type FormState = {
  nombre: string;
  codigo: string;
  categoria: string;
  descripcion: string;
  proveedor: string;
  precio_compra: string;
  precio_venta: string;
  cantidad: string;
  stock_minimo: string;
  imagen_url: string;
};

const emptyForm: FormState = {
  nombre: '',
  codigo: '',
  categoria: '',
  descripcion: '',
  proveedor: '',
  precio_compra: '',
  precio_venta: '',
  cantidad: '0',
  stock_minimo: '0',
  imagen_url: '',
};

export function ProductoModal({
  open,
  onOpenChange,
  editingProducto,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingProducto: Producto | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingProducto) {
      setForm({
        nombre: editingProducto.nombre,
        codigo: editingProducto.codigo,
        categoria: editingProducto.categoria,
        descripcion: editingProducto.descripcion,
        proveedor: editingProducto.proveedor,
        precio_compra: String(editingProducto.precio_compra),
        precio_venta: String(editingProducto.precio_venta),
        cantidad: String(editingProducto.cantidad),
        stock_minimo: String(editingProducto.stock_minimo),
        imagen_url: editingProducto.imagen_url || '',
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [editingProducto, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }
    if (!form.codigo.trim()) {
      setError('El código del producto es obligatorio.');
      return;
    }
    if (!form.categoria.trim()) {
      setError('La categoría es obligatoria.');
      return;
    }
    if (!form.descripcion.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    if (!form.proveedor.trim()) {
      setError('El proveedor es obligatorio.');
      return;
    }
    const precioCompra = parseFloat(form.precio_compra);
    if (isNaN(precioCompra) || precioCompra < 0) {
      setError('El precio de compra debe ser un número válido.');
      return;
    }
    const precioVenta = parseFloat(form.precio_venta);
    if (isNaN(precioVenta) || precioVenta < 0) {
      setError('El precio de venta debe ser un número válido.');
      return;
    }
    const cantidad = parseInt(form.cantidad);
    if (isNaN(cantidad) || cantidad < 0) {
      setError('La cantidad debe ser un número entero válido.');
      return;
    }
    const stockMinimo = parseInt(form.stock_minimo);
    if (isNaN(stockMinimo) || stockMinimo < 0) {
      setError('El stock mínimo debe ser un número entero válido.');
      return;
    }

    setLoading(true);

    const payload = {
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim(),
      categoria: form.categoria.trim(),
      descripcion: form.descripcion.trim(),
      proveedor: form.proveedor.trim(),
      precio_compra: precioCompra,
      precio_venta: precioVenta,
      cantidad,
      stock_minimo: stockMinimo,
      imagen_url: form.imagen_url.trim() || null,
    };

    let result;
    if (editingProducto) {
      result = await supabase
        .from('inventario')
        .update(payload)
        .eq('id', editingProducto.id);
    } else {
      result = await supabase.from('inventario').insert(payload);
    }

    setLoading(false);

    if (result.error) {
      if (result.error.code === '23505') {
        setError('Ya existe un producto con este código.');
      } else {
        setError('Error al guardar el producto. Intenta de nuevo.');
      }
      return;
    }

    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingProducto ? 'Editar producto' : 'Agregar producto'}
          </DialogTitle>
          <DialogDescription>
            {editingProducto
              ? 'Modifica los datos del producto seleccionado.'
              : 'Registra un nuevo producto en tu inventario.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del producto *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Camiseta algodón"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="Ej. CAM-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría *</Label>
              <Input
                id="categoria"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                placeholder="Ej. Ropa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor *</Label>
              <Input
                id="proveedor"
                value={form.proveedor}
                onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
                placeholder="Ej. Textiles S.A."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción del producto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="precio_compra">Precio de compra *</Label>
              <Input
                id="precio_compra"
                type="number"
                step="0.01"
                min="0"
                value={form.precio_compra}
                onChange={(e) => setForm((f) => ({ ...f, precio_compra: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_venta">Precio de venta *</Label>
              <Input
                id="precio_venta"
                type="number"
                step="0.01"
                min="0"
                value={form.precio_venta}
                onChange={(e) => setForm((f) => ({ ...f, precio_venta: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                min="0"
                value={form.cantidad}
                onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_minimo">Stock mínimo *</Label>
              <Input
                id="stock_minimo"
                type="number"
                min="0"
                value={form.stock_minimo}
                onChange={(e) => setForm((f) => ({ ...f, stock_minimo: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagen_url">Imagen URL (opcional)</Label>
            <Input
              id="imagen_url"
              type="url"
              value={form.imagen_url}
              onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

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
              ) : null}
              {editingProducto ? 'Guardar cambios' : 'Guardar producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
