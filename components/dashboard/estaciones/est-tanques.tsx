'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Loader2, Save, Fuel, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Producto } from '@/components/dashboard/estaciones/est-productos';

export type Tanque = {
  id: string;
  estacion_id: string;
  producto_id: string | null;
  nombre: string;
  codigo: string | null;
  capacidad_maxima_galones: number;
  nivel_actual_galones: number;
  estado: string;
  descripcion: string | null;
};

const EMPTY = {
  nombre: '',
  codigo: '',
  capacidad_maxima_galones: 0,
  nivel_actual_galones: 0,
  producto_id: '',
  estado: 'activo',
  descripcion: '',
};

interface Props {
  estacionId: string;
  estacionNombre: string;
  productos: Producto[];
  onRefresh: () => void;
}

export function EstTanques({ estacionId, estacionNombre, productos, onRefresh }: Props) {
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Tanque | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchTanques = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('est_tanques')
      .select('*')
      .eq('estacion_id', estacionId)
      .order('created_at');
    if (error) { toast.error('Error al cargar tanques'); setLoading(false); return; }
    setTanques((data as Tanque[]) ?? []);
    setLoading(false);
  }, [estacionId]);

  useEffect(() => { fetchTanques(); }, [fetchTanques]);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => { setEditItem(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (t: Tanque) => {
    setEditItem(t);
    setForm({
      nombre: t.nombre,
      codigo: t.codigo ?? '',
      capacidad_maxima_galones: t.capacidad_maxima_galones,
      nivel_actual_galones: t.nivel_actual_galones,
      producto_id: t.producto_id ?? '',
      estado: t.estado,
      descripcion: t.descripcion ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre del tanque es obligatorio.'); return; }
    if (form.capacidad_maxima_galones <= 0) { toast.error('La capacidad máxima debe ser mayor a 0.'); return; }
    setSaving(true);
    try {
      const payload = {
        estacion_id: estacionId,
        producto_id: form.producto_id || null,
        nombre: form.nombre,
        codigo: form.codigo || null,
        capacidad_maxima_galones: form.capacidad_maxima_galones,
        nivel_actual_galones: form.nivel_actual_galones,
        estado: form.estado,
        descripcion: form.descripcion || null,
      };
      if (editItem) {
        const { error } = await supabase.from('est_tanques').update(payload).eq('id', editItem.id);
        if (error) throw error;
        toast.success('Tanque actualizado.');
      } else {
        const { error } = await supabase.from('est_tanques').insert(payload);
        if (error) throw error;
        toast.success(`Tanque "${form.nombre}" creado.`);
      }
      setShowModal(false);
      fetchTanques();
      onRefresh();
    } catch (err) { toast.error('Error al guardar.'); console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el tanque "${nombre}"? Se perderá su configuración.`)) return;
    const { error } = await supabase.from('est_tanques').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    toast.success('Tanque eliminado.');
    fetchTanques();
    onRefresh();
  };

  const getProducto = (id: string | null) => productos.find((p) => p.id === id);

  const pctNivel = (t: Tanque) => t.capacidad_maxima_galones > 0 ? (t.nivel_actual_galones / t.capacidad_maxima_galones) * 100 : 0;
  const colorNivel = (pct: number) => pct < 10 ? 'bg-red-500' : pct < 20 ? 'bg-orange-500' : pct < 30 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tanques de Combustible</h2>
          <p className="text-sm text-slate-500">{estacionNombre} — {tanques.length} tanque{tanques.length !== 1 ? 's' : ''} configurado{tanques.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Nuevo tanque</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
      ) : tanques.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Fuel className="h-12 w-12 text-slate-200" />
          <p className="mt-4 text-base font-semibold text-slate-600">No hay tanques configurados</p>
          <p className="mt-1 text-sm text-slate-400">Configura los tanques de almacenamiento de esta estación.</p>
          <Button className="mt-5 gap-2" onClick={openNew}><Plus className="h-4 w-4" />Agregar tanque</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tanques.map((t) => {
            const pct = pctNivel(t);
            const prod = getProducto(t.producto_id);
            return (
              <Card key={t.id} className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="h-2 w-full" style={{ background: prod?.color ?? '#94a3b8' }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-white shadow-sm" style={{ background: prod?.color ?? '#94a3b8' }}>
                        <Fuel className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.nombre}</p>
                        <p className="text-xs text-slate-400">{t.codigo || 'Sin código'}</p>
                      </div>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', t.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                      {t.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{prod?.nombre ?? 'Sin producto'}</span>
                      <span className="font-bold text-slate-900">{t.nivel_actual_galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal</span>
                    </div>
                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={cn('h-full rounded-full transition-all', colorNivel(pct))} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>{pct.toFixed(1)}% usado</span>
                      <span>Cap. {t.capacidad_maxima_galones.toLocaleString('es-CO')} gal</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => openEdit(t)}>
                      <Edit2 className="h-3 w-3" />Editar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => handleDelete(t.id, t.nombre)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          <button onClick={openNew} className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-slate-400 transition-all hover:border-amber-300 hover:bg-amber-50/40 hover:text-amber-600">
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">Agregar tanque</span>
          </button>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><Fuel className="h-4 w-4 text-amber-600" /></span>
              {editItem ? 'Editar tanque' : 'Nuevo tanque'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nombre del tanque *</Label>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Tanque 1, Tanque Corriente…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Código</Label>
              <Input value={form.codigo} onChange={(e) => set('codigo', e.target.value)} placeholder="T-01, T-COR…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Tipo de combustible</Label>
              <Select value={form.producto_id} onValueChange={(v) => set('producto_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Capacidad máxima (galones) *</Label>
              <Input type="number" min={0} step={1} value={form.capacidad_maxima_galones} onChange={(e) => set('capacidad_maxima_galones', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nivel actual (galones)</Label>
              <Input type="number" min={0} step={0.01} value={form.nivel_actual_galones} onChange={(e) => set('nivel_actual_galones', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set('estado', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="inactivo">Inactivo</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Descripción</Label>
              <Textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Ubicación, material, observaciones…" rows={2} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editItem ? 'Guardar' : 'Crear tanque'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
