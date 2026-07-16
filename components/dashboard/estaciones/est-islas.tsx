'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Save, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type Isla = {
  id: string; estacion_id: string; nombre: string; codigo: string | null;
  descripcion: string | null; estado: string; color: string; orden: number;
};

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16'];
const EMPTY = { nombre: '', codigo: '', descripcion: '', estado: 'activa', color: '#3b82f6', orden: 1 };

interface Props {
  estacionId: string;
  estacionNombre: string;
  islas: Isla[];
  surtidorCount: (islaId: string) => number;
  mangueraCount: (islaId: string) => number;
  onRefresh: () => void;
}

export function EstIslas({ estacionId, estacionNombre, islas, surtidorCount, mangueraCount, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Isla | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showModal) setForm(editItem ? {
      nombre: editItem.nombre, codigo: editItem.codigo ?? '',
      descripcion: editItem.descripcion ?? '', estado: editItem.estado,
      color: editItem.color, orden: editItem.orden,
    } : { ...EMPTY, orden: islas.length + 1 });
  }, [showModal, editItem, islas.length]);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, estacion_id: estacionId };
      if (editItem) {
        const { error } = await supabase.from('est_islas').update(payload).eq('id', editItem.id);
        if (error) throw error;
        toast.success('Isla actualizada.');
      } else {
        const { error } = await supabase.from('est_islas').insert(payload);
        if (error) throw error;
        toast.success(`Isla "${form.nombre}" creada.`);
      }
      setShowModal(false); onRefresh();
    } catch (err) { toast.error('Error al guardar.'); console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Se eliminarán todos sus surtidores y mangueras.`)) return;
    const { error } = await supabase.from('est_islas').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    toast.success('Isla eliminada.'); onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Islas — {estacionNombre}</h2>
          <p className="text-sm text-slate-500">{islas.length} isla{islas.length !== 1 ? 's' : ''} configurada{islas.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="gap-2"><Plus className="h-4 w-4" />Agregar isla</Button>
      </div>

      {islas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm"><Layers className="h-8 w-8 text-slate-300" /></div>
          <h3 className="mt-4 text-base font-bold text-slate-700">Sin islas configuradas</h3>
          <p className="mt-1 text-sm text-slate-400">Las islas son los módulos físicos que agrupan los surtidores.</p>
          <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="mt-5 gap-2"><Plus className="h-4 w-4" />Crear primera isla</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {islas.sort((a, b) => a.orden - b.orden).map((isla) => (
            <Card key={isla.id} className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="h-1.5 w-full" style={{ background: isla.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm shadow-sm" style={{ background: isla.color }}>
                      {isla.orden}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{isla.nombre}</p>
                      <p className="text-xs text-slate-400">{isla.codigo || 'Sin código'}</p>
                    </div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', isla.estado === 'activa' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                    {isla.estado === 'activa' ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {isla.descripcion && <p className="mb-3 text-xs text-slate-500 line-clamp-2">{isla.descripcion}</p>}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                    <p className="text-xl font-bold text-slate-900">{surtidorCount(isla.id)}</p>
                    <p className="text-[10px] text-slate-400">Surtidores</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                    <p className="text-xl font-bold text-slate-900">{mangueraCount(isla.id)}</p>
                    <p className="text-[10px] text-slate-400">Mangueras</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => { setEditItem(isla); setShowModal(true); }}>
                    <Edit2 className="h-3 w-3" />Editar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-500 hover:bg-red-50 hover:border-red-200" onClick={() => handleDelete(isla.id, isla.nombre)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <button onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-600 min-h-48">
            <Plus className="h-8 w-8" /><span className="text-sm font-medium">Agregar isla</span>
          </button>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><Layers className="h-4 w-4 text-blue-600" /></span>
              {editItem ? 'Editar isla' : 'Nueva isla'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Isla 1, Isla Central…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Código</Label>
              <Input value={form.codigo} onChange={(e) => set('codigo', e.target.value)} placeholder="ISL-01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Orden / Número</Label>
              <Input type="number" min={1} value={form.orden} onChange={(e) => set('orden', parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set('estado', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="activa">Activa</SelectItem><SelectItem value="inactiva">Inactiva</SelectItem><SelectItem value="mantenimiento">Mantenimiento</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="h-10 w-12 cursor-pointer rounded-xl border border-slate-200 p-1" />
                <div className="flex flex-wrap gap-1">
                  {PRESET_COLORS.map((c) => <button key={c} type="button" onClick={() => set('color', c)} className={cn('h-6 w-6 rounded-full border-2 transition-all', form.color === c ? 'border-slate-800 scale-110' : 'border-white shadow-sm')} style={{ background: c }} />)}
                </div>
              </div>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Descripción</Label>
              <Input value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Descripción opcional" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editItem ? 'Guardar' : 'Crear isla'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
