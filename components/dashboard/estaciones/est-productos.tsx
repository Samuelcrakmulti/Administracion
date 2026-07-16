'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Save, Droplets, Palette } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type Producto = {
  id: string; nombre: string; codigo: string | null; color: string;
  precio_litro: number; unidad: string; estado: string; descripcion: string | null;
};

const PRESET_COLORS = ['#f59e0b', '#10b981', '#1e293b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
const PRESETS = [
  { nombre: 'Gasolina Corriente', color: '#f59e0b', codigo: 'GC' },
  { nombre: 'Gasolina Extra', color: '#10b981', codigo: 'GE' },
  { nombre: 'Diesel / ACPM', color: '#1e293b', codigo: 'DC' },
  { nombre: 'Gas Natural (GNV)', color: '#3b82f6', codigo: 'GN' },
];

const EMPTY = { nombre: '', codigo: '', color: '#3b82f6', precio_litro: 0, unidad: 'Litro', estado: 'activo', descripcion: '' };

interface Props { productos: Producto[]; onRefresh: () => void }

export function EstProductos({ productos, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Producto | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showModal) setForm(editItem ? { nombre: editItem.nombre, codigo: editItem.codigo ?? '', color: editItem.color, precio_litro: editItem.precio_litro, unidad: editItem.unidad, estado: editItem.estado, descripcion: editItem.descripcion ?? '' } : EMPTY);
  }, [showModal, editItem]);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase.from('est_productos').update(form).eq('id', editItem.id);
        if (error) throw error;
        toast.success('Producto actualizado.');
      } else {
        const { error } = await supabase.from('est_productos').insert(form);
        if (error) throw error;
        toast.success(`Producto "${form.nombre}" creado.`);
      }
      setShowModal(false); onRefresh();
    } catch (err) { toast.error('Error al guardar.'); console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Las mangueras asociadas perderán su asignación.`)) return;
    const { error } = await supabase.from('est_productos').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    toast.success('Producto eliminado.'); onRefresh();
  };

  const addPreset = (p: typeof PRESETS[0]) => {
    setForm({ ...EMPTY, nombre: p.nombre, codigo: p.codigo, color: p.color });
    setEditItem(null); setShowModal(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Catálogo de productos</h2>
          <p className="text-sm text-slate-500">{productos.length} producto{productos.length !== 1 ? 's' : ''} configurado{productos.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="gap-2"><Plus className="h-4 w-4" />Nuevo producto</Button>
      </div>

      {/* Presets */}
      {productos.length === 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-700">Agregar productos comunes rápidamente:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.nombre} onClick={() => addPreset(p)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                <span className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ background: p.color }} />
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      {productos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((prod) => (
            <Card key={prod.id} className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-2 w-full" style={{ background: prod.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-white shadow-sm" style={{ background: prod.color }}>
                      <Droplets className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{prod.nombre}</p>
                      <p className="text-xs text-slate-400">{prod.codigo || 'Sin código'}</p>
                    </div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', prod.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                    {prod.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-lg font-bold text-slate-900">${prod.precio_litro.toLocaleString('es-CO')}</p>
                    <p className="text-[10px] text-slate-400">por {prod.unidad.toLowerCase()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <div className="mx-auto h-5 w-5 rounded-full border-2 border-white shadow-sm" style={{ background: prod.color }} />
                    <p className="mt-1 text-[10px] text-slate-400 font-mono">{prod.color}</p>
                  </div>
                </div>
                {prod.descripcion && <p className="mt-3 text-xs text-slate-500 line-clamp-2">{prod.descripcion}</p>}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => { setEditItem(prod); setShowModal(true); }}>
                    <Edit2 className="h-3 w-3" />Editar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => handleDelete(prod.id, prod.nombre)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* Add card */}
          <button onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-600">
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">Agregar producto</span>
          </button>
        </div>
      )}

      {/* Empty + add card when no products */}
      {productos.length === 0 && (
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-14 text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-600">
          <Plus className="h-8 w-8" />
          <span className="text-sm font-medium">Agregar producto personalizado</span>
        </button>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><Droplets className="h-4 w-4 text-blue-600" /></span>
              {editItem ? 'Editar producto' : 'Nuevo producto / combustible'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nombre del producto *</Label>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Gasolina Corriente, Diesel, GNV…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Código</Label>
              <Input value={form.codigo} onChange={(e) => set('codigo', e.target.value)} placeholder="GC, GE, DC…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Unidad de medida</Label>
              <Select value={form.unidad} onValueChange={(v) => set('unidad', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Litro">Litro</SelectItem>
                  <SelectItem value="Galón">Galón</SelectItem>
                  <SelectItem value="m³">Metro cúbico (m³)</SelectItem>
                  <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Precio por litro / unidad ($)</Label>
              <Input type="number" min={0} step={1} value={form.precio_litro} onChange={(e) => set('precio_litro', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set('estado', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="inactivo">Inactivo</SelectItem></SelectContent>
              </Select>
            </div>
            {/* Color picker */}
            <div className="col-span-2 space-y-2">
              <Label className="text-xs font-semibold text-slate-600">Color identificador</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="h-10 w-16 cursor-pointer rounded-xl border border-slate-200 p-1" />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => set('color', c)}
                      className={cn('h-7 w-7 rounded-full border-2 transition-all', form.color === c ? 'border-slate-900 scale-110' : 'border-white shadow-sm hover:scale-110')}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Descripción</Label>
              <Input value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Octanaje, características especiales…" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editItem ? 'Guardar' : 'Crear producto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
