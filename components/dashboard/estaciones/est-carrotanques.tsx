'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Save, Truck, Fuel, Calendar, FileText, User } from 'lucide-react';
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
import type { Tanque } from '@/components/dashboard/estaciones/est-tanques';
import type { Producto } from '@/components/dashboard/estaciones/est-productos';

export type Carrotanque = {
  id: string;
  estacion_id: string;
  tanque_id: string;
  producto_id: string | null;
  fecha: string;
  hora: string | null;
  proveedor: string | null;
  numero_factura: string | null;
  numero_carrotanque: string | null;
  conductor: string | null;
  tipo_combustible: string | null;
  cantidad_galones: number;
  observaciones: string | null;
  created_at: string;
};

const EMPTY = {
  tanque_id: '',
  producto_id: '',
  fecha: new Date().toISOString().split('T')[0],
  hora: '',
  proveedor: '',
  numero_factura: '',
  numero_carrotanque: '',
  conductor: '',
  tipo_combustible: '',
  cantidad_galones: 0,
  observaciones: '',
};

interface Props {
  estacionId: string;
  estacionNombre: string;
  tanques: Tanque[];
  productos: Producto[];
  onRefresh: () => void;
}

export function EstCarrotanques({ estacionId, estacionNombre, tanques, productos, onRefresh }: Props) {
  const [registros, setRegistros] = useState<Carrotanque[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('est_carrotanques')
      .select('*')
      .eq('estacion_id', estacionId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) { toast.error('Error al cargar descargas'); setLoading(false); return; }
    setRegistros((data as Carrotanque[]) ?? []);
    setLoading(false);
  }, [estacionId]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const getTanque = (id: string) => tanques.find((t) => t.id === id);
  const getProducto = (id: string | null) => productos.find((p) => p.id === id);

  const openNew = () => {
    const now = new Date();
    setForm({
      ...EMPTY,
      hora: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      tanque_id: tanques[0]?.id ?? '',
      producto_id: tanques[0]?.producto_id ?? '',
      tipo_combustible: getProducto(tanques[0]?.producto_id ?? '')?.nombre ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.tanque_id) { toast.error('Selecciona un tanque destino.'); return; }
    if (form.cantidad_galones <= 0) { toast.error('La cantidad descargada debe ser mayor a 0.'); return; }

    const tanque = getTanque(form.tanque_id);
    if (!tanque) { toast.error('Tanque no encontrado.'); return; }

    const nuevoNivel = tanque.nivel_actual_galones + form.cantidad_galones;
    if (nuevoNivel > tanque.capacidad_maxima_galones) {
      if (!confirm(`La descarga (${form.cantidad_galones} gal) excede la capacidad del tanque (${tanque.capacidad_maxima_galones} gal). Nivel resultante: ${nuevoNivel.toFixed(2)} gal. ¿Deseas continuar?`)) return;
    }

    setSaving(true);
    try {
      const { data: carrotanqueData, error: insertError } = await supabase.from('est_carrotanques').insert({
        estacion_id: estacionId,
        tanque_id: form.tanque_id,
        producto_id: form.producto_id || null,
        fecha: form.fecha,
        hora: form.hora || null,
        proveedor: form.proveedor || null,
        numero_factura: form.numero_factura || null,
        numero_carrotanque: form.numero_carrotanque || null,
        conductor: form.conductor || null,
        tipo_combustible: form.tipo_combustible || null,
        cantidad_galones: form.cantidad_galones,
        observaciones: form.observaciones || null,
      }).select().single();

      if (insertError) throw insertError;

      const nivelAnterior = tanque.nivel_actual_galones;
      const { error: updateError } = await supabase.from('est_tanques')
        .update({ nivel_actual_galones: nuevoNivel, updated_at: new Date().toISOString() })
        .eq('id', form.tanque_id);
      if (updateError) throw updateError;

      await supabase.from('est_movimientos_inventario').insert({
        estacion_id: estacionId,
        tanque_id: form.tanque_id,
        producto_id: form.producto_id || null,
        fecha: form.fecha,
        hora: form.hora || null,
        tipo: 'entrada',
        concepto: 'carrotanque',
        galones: form.cantidad_galones,
        nivel_anterior: nivelAnterior,
        nivel_posterior: nuevoNivel,
        responsable: form.conductor || form.proveedor || null,
        carrotanque_id: carrotanqueData?.id ?? null,
        observaciones: form.observaciones || null,
      });

      toast.success(`Descarga de ${form.cantidad_galones} gal registrada. Nuevo nivel: ${nuevoNivel.toFixed(2)} gal.`);
      setShowModal(false);
      fetchRegistros();
      onRefresh();
    } catch (err) { toast.error('Error al registrar la descarga.'); console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de descarga? El inventario no se revertirá automáticamente.')) return;
    const { error } = await supabase.from('est_carrotanques').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    toast.success('Registro eliminado.');
    fetchRegistros();
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Entradas de Carrotanques</h2>
          <p className="text-sm text-slate-500">{estacionNombre} — {registros.length} descarga{registros.length !== 1 ? 's' : ''} registrada{registros.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={tanques.length === 0}><Plus className="h-4 w-4" />Nueva descarga</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
      ) : registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Truck className="h-12 w-12 text-slate-200" />
          <p className="mt-4 text-base font-semibold text-slate-600">No hay descargas registradas</p>
          <p className="mt-1 text-sm text-slate-400">Registra cada entrada de carrotanque para actualizar el inventario automáticamente.</p>
          {tanques.length > 0 && <Button className="mt-5 gap-2" onClick={openNew}><Plus className="h-4 w-4" />Registrar descarga</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {registros.map((r) => {
            const tanque = getTanque(r.tanque_id);
            const prod = getProducto(r.producto_id) ?? (r.tipo_combustible ? { nombre: r.tipo_combustible, color: '#94a3b8' } : null);
            return (
              <Card key={r.id} className="overflow-hidden transition-all hover:shadow-md">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: (prod?.color ?? '#94a3b8') + '20' }}>
                    <Truck className="h-6 w-6" style={{ color: prod?.color ?? '#94a3b8' }} />
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Fecha</p>
                      <p className="text-sm font-medium text-slate-900">{r.fecha}{r.hora ? ` ${r.hora}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Combustible</p>
                      <p className="text-sm font-medium text-slate-900">{r.tipo_combustible ?? prod?.nombre ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Tanque</p>
                      <p className="text-sm font-medium text-slate-900">{tanque?.nombre ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Galones</p>
                      <p className="text-sm font-bold text-emerald-600">+{r.cantidad_galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Proveedor</p>
                      <p className="text-sm text-slate-700">{r.proveedor ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Factura</p>
                      <p className="text-sm text-slate-700">{r.numero_factura ?? '—'}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shrink-0" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {r.observaciones && <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">{r.observaciones}</div>}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50"><Truck className="h-4 w-4 text-emerald-600" /></span>
              Nueva descarga de carrotanque
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Tanque destino *</Label>
              <Select value={form.tanque_id} onValueChange={(v) => {
                const t = getTanque(v);
                set('tanque_id', v);
                if (t?.producto_id) { set('producto_id', t.producto_id); set('tipo_combustible', getProducto(t.producto_id)?.nombre ?? ''); }
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {tanques.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre} ({(getProducto(t.producto_id)?.nombre ?? 'N/A')})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Tipo de combustible</Label>
              <Select value={form.producto_id} onValueChange={(v) => { set('producto_id', v); set('tipo_combustible', getProducto(v)?.nombre ?? ''); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha *</Label>
              <Input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Hora</Label>
              <Input type="time" value={form.hora} onChange={(e) => set('hora', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Proveedor</Label>
              <Input value={form.proveedor} onChange={(e) => set('proveedor', e.target.value)} placeholder="Nombre del proveedor" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Número de factura</Label>
              <Input value={form.numero_factura} onChange={(e) => set('numero_factura', e.target.value)} placeholder="FACT-001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Número del carrotanque</Label>
              <Input value={form.numero_carrotanque} onChange={(e) => set('numero_carrotanque', e.target.value)} placeholder="Placa o ID" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Conductor</Label>
              <Input value={form.conductor} onChange={(e) => set('conductor', e.target.value)} placeholder="Nombre del conductor" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Cantidad descargada (galones) *</Label>
              <Input type="number" min={0} step={0.01} value={form.cantidad_galones} onChange={(e) => set('cantidad_galones', parseFloat(e.target.value) || 0)} />
              {form.tanque_id && (() => {
                const t = getTanque(form.tanque_id);
                if (!t) return null;
                const nuevoNivel = t.nivel_actual_galones + form.cantidad_galones;
                return (
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-500">Actual: <b className="text-slate-700">{t.nivel_actual_galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal</b></span>
                    <span className="text-slate-500">Nuevo: <b className={cn(nuevoNivel > t.capacidad_maxima_galones ? 'text-red-600' : 'text-emerald-600')}>{nuevoNivel.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal</b></span>
                    {nuevoNivel > t.capacidad_maxima_galones && <span className="font-semibold text-red-600">Excede capacidad</span>}
                  </div>
                );
              })()}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observaciones</Label>
              <Textarea value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Notas sobre la descarga…" rows={2} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Registrar descarga
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
