'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Save, Gauge, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Isla } from './est-islas';

export type Surtidor = {
  id: string; isla_id: string; estacion_id: string; numero: number; nombre: string;
  codigo: string | null; marca: string | null; modelo: string | null; serie: string | null;
  estado: string; fecha_instalacion: string | null; observaciones: string | null;
};

const ESTADO_MAP = {
  activo: { label: 'Activo', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  mantenimiento: { label: 'Mantenimiento', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  fuera_servicio: { label: 'Fuera de servicio', icon: XCircle, color: 'text-red-600 bg-red-50' },
};

const EMPTY = { isla_id: '', numero: 1, nombre: '', codigo: '', marca: '', modelo: '', serie: '', estado: 'activo', fecha_instalacion: '', observaciones: '' };

interface Props {
  estacionId: string; estacionNombre: string;
  islas: Isla[]; surtidores: Surtidor[];
  mangueraCount: (surtidorId: string) => number;
  onRefresh: () => void;
}

export function EstSurtidores({ estacionId, estacionNombre, islas, surtidores, mangueraCount, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Surtidor | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterIsla, setFilterIsla] = useState<string>('todas');

  useEffect(() => {
    if (showModal) setForm(editItem ? {
      isla_id: editItem.isla_id, numero: editItem.numero, nombre: editItem.nombre,
      codigo: editItem.codigo ?? '', marca: editItem.marca ?? '', modelo: editItem.modelo ?? '',
      serie: editItem.serie ?? '', estado: editItem.estado,
      fecha_instalacion: editItem.fecha_instalacion ?? '', observaciones: editItem.observaciones ?? '',
    } : { ...EMPTY, isla_id: islas[0]?.id ?? '', numero: surtidores.length + 1 });
  }, [showModal, editItem, islas, surtidores.length]);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.isla_id) { toast.error('Nombre e isla son obligatorios.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, estacion_id: estacionId, numero: Number(form.numero) };
      if (editItem) {
        const { error } = await supabase.from('est_surtidores').update(payload).eq('id', editItem.id);
        if (error) throw error; toast.success('Surtidor actualizado.');
      } else {
        const { error } = await supabase.from('est_surtidores').insert(payload);
        if (error) throw error; toast.success(`Surtidor "${form.nombre}" creado.`);
      }
      setShowModal(false); onRefresh();
    } catch (err) { toast.error('Error al guardar.'); console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Se eliminarán todas sus mangueras.`)) return;
    const { error } = await supabase.from('est_surtidores').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    toast.success('Surtidor eliminado.'); onRefresh();
  };

  const filteredIslas = filterIsla === 'todas' ? islas : islas.filter((i) => i.id === filterIsla);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Surtidores — {estacionNombre}</h2>
          <p className="text-sm text-slate-500">{surtidores.length} surtidor{surtidores.length !== 1 ? 'es' : ''} configurado{surtidores.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterIsla} onValueChange={setFilterIsla}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las islas</SelectItem>
              {islas.map((i) => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="gap-2"><Plus className="h-4 w-4" />Agregar surtidor</Button>
        </div>
      </div>

      {islas.length === 0 ? (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-6 text-center">
          <p className="text-sm font-medium text-amber-800">Primero debes crear al menos una isla antes de agregar surtidores.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredIslas.sort((a, b) => a.orden - b.orden).map((isla) => {
            const islasSurtidores = surtidores.filter((s) => s.isla_id === isla.id);
            return (
              <div key={isla.id}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl text-white text-sm font-bold" style={{ background: isla.color }}>{isla.orden}</div>
                  <h3 className="text-sm font-bold text-slate-900">{isla.nombre}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{islasSurtidores.length} surtidor{islasSurtidores.length !== 1 ? 'es' : ''}</span>
                  <div className="ml-auto">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setEditItem(null); setForm((p) => ({ ...p, isla_id: isla.id })); setShowModal(true); }}>
                      <Plus className="h-3 w-3" />Agregar a {isla.nombre}
                    </Button>
                  </div>
                </div>

                {islasSurtidores.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                    Sin surtidores en esta isla.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {islasSurtidores.sort((a, b) => a.numero - b.numero).map((surt) => {
                      const ec = ESTADO_MAP[surt.estado as keyof typeof ESTADO_MAP] ?? ESTADO_MAP.activo;
                      return (
                        <div key={surt.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm">S{surt.numero}</div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{surt.nombre}</p>
                                <p className="text-xs text-slate-400">{surt.codigo || surt.marca || 'Sin código'}</p>
                              </div>
                            </div>
                            <span className={cn('shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', ec.color)}>
                              <ec.icon className="h-3 w-3" />{ec.label}
                            </span>
                          </div>

                          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-slate-50 p-2">
                              <p className="text-sm font-bold text-slate-900">{mangueraCount(surt.id)}</p>
                              <p className="text-[10px] text-slate-400">Mangueras</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2 col-span-2">
                              <p className="text-xs text-slate-700 truncate">{surt.marca ? `${surt.marca}${surt.modelo ? ` ${surt.modelo}` : ''}` : 'Sin marca'}</p>
                              <p className="text-[10px] text-slate-400">Marca / Modelo</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => { setEditItem(surt); setShowModal(true); }}><Edit2 className="h-3 w-3" />Editar</Button>
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-red-500 hover:bg-red-50 hover:border-red-200" onClick={() => handleDelete(surt.id, surt.nombre)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><Gauge className="h-4 w-4 text-slate-700" /></span>
              {editItem ? 'Editar surtidor' : 'Nuevo surtidor'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Isla *</Label>
              <Select value={form.isla_id} onValueChange={(v) => set('isla_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar isla…" /></SelectTrigger>
                <SelectContent>{islas.map((i) => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Surtidor 1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Número</Label>
              <Input type="number" min={1} value={form.numero} onChange={(e) => set('numero', parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Código</Label>
              <Input value={form.codigo} onChange={(e) => set('codigo', e.target.value)} placeholder="S-001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set('estado', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="mantenimiento">En mantenimiento</SelectItem>
                  <SelectItem value="fuera_servicio">Fuera de servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Marca</Label>
              <Input value={form.marca} onChange={(e) => set('marca', e.target.value)} placeholder="Tokheim, Wayne, Gilbarco…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Modelo</Label>
              <Input value={form.modelo} onChange={(e) => set('modelo', e.target.value)} placeholder="Premier 116" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Serie</Label>
              <Input value={form.serie} onChange={(e) => set('serie', e.target.value)} placeholder="SN-2024-001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha instalación</Label>
              <Input type="date" value={form.fecha_instalacion} onChange={(e) => set('fecha_instalacion', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observaciones</Label>
              <Input value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Notas técnicas, historial…" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editItem ? 'Guardar' : 'Crear surtidor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
