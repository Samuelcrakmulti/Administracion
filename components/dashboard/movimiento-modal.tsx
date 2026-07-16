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
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type Movimiento = {
  id: string;
  user_id: string;
  tipo: 'Ingreso' | 'Gasto';
  categoria: string;
  descripcion: string;
  valor: number;
  fecha: string;
  created_at: string;
};

type FormState = {
  tipo: 'Ingreso' | 'Gasto';
  categoria: string;
  descripcion: string;
  valor: string;
  fecha: string;
};

const emptyForm: FormState = {
  tipo: 'Ingreso',
  categoria: '',
  descripcion: '',
  valor: '',
  fecha: new Date().toISOString().slice(0, 10),
};

const categoriasIngreso = [
  'Ventas',
  'Servicios',
  'Inversiones',
  'Otros ingresos',
];
const categoriasGasto = [
  'Proveedores',
  'Renta',
  'Servicios públicos',
  'Salarios',
  'Marketing',
  'Impuestos',
  'Otros gastos',
];

export function MovimientoModal({
  open,
  onOpenChange,
  editingMovimiento,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingMovimiento: Movimiento | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingMovimiento) {
      setForm({
        tipo: editingMovimiento.tipo,
        categoria: editingMovimiento.categoria,
        descripcion: editingMovimiento.descripcion,
        valor: String(editingMovimiento.valor),
        fecha: editingMovimiento.fecha,
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [editingMovimiento, open]);

  const categorias =
    form.tipo === 'Ingreso' ? categoriasIngreso : categoriasGasto;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.categoria) {
      setError('Selecciona una categoría.');
      return;
    }
    if (!form.descripcion.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    const valorNum = parseFloat(form.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('Ingresa un valor válido mayor a 0.');
      return;
    }
    if (!form.fecha) {
      setError('Selecciona una fecha.');
      return;
    }

    setLoading(true);

    const payload = {
      tipo: form.tipo,
      categoria: form.categoria,
      descripcion: form.descripcion.trim(),
      valor: valorNum,
      fecha: form.fecha,
    };

    let result;
    if (editingMovimiento) {
      result = await supabase
        .from('finanzas')
        .update(payload)
        .eq('id', editingMovimiento.id);
    } else {
      result = await supabase.from('finanzas').insert(payload);
    }

    setLoading(false);

    if (result.error) {
      setError('Error al guardar el movimiento. Intenta de nuevo.');
      return;
    }

    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingMovimiento ? 'Editar movimiento' : 'Nuevo movimiento'}
          </DialogTitle>
          <DialogDescription>
            {editingMovimiento
              ? 'Modifica los datos del movimiento seleccionado.'
              : 'Registra un nuevo ingreso o gasto de tu empresa.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de movimiento</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, tipo: 'Ingreso', categoria: '' }))
                }
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                  form.tipo === 'Ingreso'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className="text-lg leading-none">+</span> Ingreso
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, tipo: 'Gasto', categoria: '' }))
                }
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                  form.tipo === 'Gasto'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className="text-lg leading-none">−</span> Gasto
              </button>
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
            >
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripcion */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={form.descripcion}
              onChange={(e) =>
                setForm((f) => ({ ...f, descripcion: e.target.value }))
              }
              placeholder="Ej. Venta de productos — Tienda online"
            />
          </div>

          {/* Valor + Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valor: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha: e.target.value }))
                }
              />
            </div>
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
              {editingMovimiento ? 'Guardar cambios' : 'Guardar movimiento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
