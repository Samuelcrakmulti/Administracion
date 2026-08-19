'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Save, Plus, Trash2, DollarSign, Ticket, SlidersHorizontal,
  Wallet, CreditCard, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Estacion } from './est-estaciones';
import type { Cierre } from './est-cierre-detalle';

type MedioPagoConfig = { id: string; nombre: string; tipo: string; estado: string; orden: number };
type PagoTurno = { id: string; medio_pago_config_id: string | null; medio_pago_nombre: string; valor: number; observacion: string | null };
type ValeConcepto = { id: string; nombre: string; descripcion: string | null; estado: string };
type Vale = { id: string; concepto_id: string | null; concepto_nombre: string; valor: number; observacion: string | null };
type Ajuste = { id: string; concepto: string; tipo: string; valor: number; motivo: string };

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface Props {
  cierre: Cierre;
  estacion: Estacion;
  readOnly: boolean;
}

export function EstCierrePagos({ cierre, estacion, readOnly }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediosConfig, setMediosConfig] = useState<MedioPagoConfig[]>([]);
  const [pagos, setPagos] = useState<PagoTurno[]>([]);
  const [conceptosVales, setConceptosVales] = useState<ValeConcepto[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [showMedioModal, setShowMedioModal] = useState(false);
  const [showValeConceptoModal, setShowValeConceptoModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [newMedio, setNewMedio] = useState({ nombre: '', tipo: 'efectivo' });
  const [newConcepto, setNewConcepto] = useState({ nombre: '', descripcion: '' });
  const [newAjuste, setNewAjuste] = useState({ concepto: '', tipo: 'negativo', valor: 0, motivo: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [mediosRes, pagosRes, conceptosRes, valesRes, ajustesRes] = await Promise.all([
      supabase.from('est_medios_pago_config').select('*').eq('estacion_id', estacion.id).eq('estado', 'activo').order('orden'),
      supabase.from('est_pagos_turno').select('*').eq('cierre_id', cierre.id),
      supabase.from('est_vales_conceptos').select('*').eq('estacion_id', estacion.id).eq('estado', 'activo').order('nombre'),
      supabase.from('est_vales').select('*').eq('cierre_id', cierre.id),
      supabase.from('est_ajustes').select('*').eq('cierre_id', cierre.id),
    ]);

    const mediosData = (mediosRes.data as MedioPagoConfig[]) ?? [];
    const pagosData = (pagosRes.data as PagoTurno[]) ?? [];

    // Ensure there's a pago row for each configured medio
    const existingMedioIds = new Set(pagosData.map((p) => p.medio_pago_config_id));
    const missingMedios = mediosData.filter((m) => !existingMedioIds.has(m.id));
    let pagosCompletos = pagosData;
    if (missingMedios.length > 0 && !readOnly) {
      const inserts = missingMedios.map((m) => ({
        cierre_id: cierre.id,
        estacion_id: estacion.id,
        medio_pago_config_id: m.id,
        medio_pago_nombre: m.nombre,
        valor: 0,
      }));
      const { data: inserted } = await supabase.from('est_pagos_turno').insert(inserts).select('*');
      if (inserted) pagosCompletos = [...pagosData, ...(inserted as PagoTurno[])];
    }

    setMediosConfig(mediosData);
    setPagos(pagosCompletos.sort((a, b) => {
      const ma = mediosData.find((m) => m.id === a.medio_pago_config_id)?.orden ?? 99;
      const mb = mediosData.find((m) => m.id === b.medio_pago_config_id)?.orden ?? 99;
      return ma - mb;
    }));
    setConceptosVales((conceptosRes.data as ValeConcepto[]) ?? []);
    setVales((valesRes.data as Vale[]) ?? []);
    setAjustes((ajustesRes.data as Ajuste[]) ?? []);
    setLoading(false);
  }, [cierre.id, estacion.id, readOnly]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalPagos = pagos.reduce((s, p) => s + (p.valor || 0), 0);
  const totalVales = vales.reduce((s, v) => s + (v.valor || 0), 0);
  const totalAjustesPos = ajustes.filter((a) => a.tipo === 'positivo').reduce((s, a) => s + (a.valor || 0), 0);
  const totalAjustesNeg = ajustes.filter((a) => a.tipo === 'negativo').reduce((s, a) => s + (a.valor || 0), 0);

  const handlePagoChange = (pagoId: string, valor: number) => {
    setPagos((prev) => prev.map((p) => p.id === pagoId ? { ...p, valor } : p));
  };

  const handleSavePagos = async () => {
    setSaving(true);
    try {
      const updates = pagos.map((p) => ({
        id: p.id,
        valor: p.valor || 0,
        observacion: p.observacion,
        updated_at: new Date().toISOString(),
      }));
      for (const u of updates) {
        const { error } = await supabase.from('est_pagos_turno').update({ valor: u.valor, updated_at: u.updated_at }).eq('id', u.id);
        if (error) throw error;
      }
      await supabase.from('est_cuadre_auditoria').insert({
        cierre_id: cierre.id,
        estacion_id: estacion.id,
        tabla_afectada: 'est_pagos_turno',
        campo_modificado: 'valor',
        accion: 'actualizacion_pagos',
        usuario: user?.email ?? 'Sistema',
      });
      toast.success('Pagos guardados correctamente.');
    } catch (err) {
      toast.error('Error al guardar los pagos.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedio = async () => {
    if (!newMedio.nombre.trim()) { toast.error('Ingresa un nombre.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('est_medios_pago_config').insert({
        estacion_id: estacion.id,
        nombre: newMedio.nombre.trim(),
        tipo: newMedio.tipo,
        orden: mediosConfig.length,
      });
      if (error) throw error;
      toast.success('Medio de pago agregado.');
      setShowMedioModal(false);
      setNewMedio({ nombre: '', tipo: 'efectivo' });
      fetchAll();
    } catch (err) {
      toast.error('Error al agregar el medio de pago.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddValeConcepto = async () => {
    if (!newConcepto.nombre.trim()) { toast.error('Ingresa un nombre.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('est_vales_conceptos').insert({
        estacion_id: estacion.id,
        nombre: newConcepto.nombre.trim(),
        descripcion: newConcepto.descripcion.trim() || null,
      });
      if (error) throw error;
      toast.success('Concepto de vale agregado.');
      setShowValeConceptoModal(false);
      setNewConcepto({ nombre: '', descripcion: '' });
      fetchAll();
    } catch (err) {
      toast.error('Error al agregar el concepto.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddVale = async () => {
    if (conceptosVales.length === 0) { toast.error('No hay conceptos configurados.'); return; }
    setSaving(true);
    try {
      const concepto = conceptosVales[0];
      const { data, error } = await supabase.from('est_vales').insert({
        cierre_id: cierre.id,
        estacion_id: estacion.id,
        concepto_id: concepto.id,
        concepto_nombre: concepto.nombre,
        valor: 0,
        created_by: user?.email ?? null,
      }).select('*').single();
      if (error) throw error;
      setVales((prev) => [...prev, data as Vale]);
      toast.success('Vale agregado.');
    } catch (err) {
      toast.error('Error al agregar el vale.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVale = async (id: string, field: 'concepto_id' | 'valor' | 'observacion', value: string | number) => {
    setVales((prev) => prev.map((v) => {
      if (v.id !== id) return v;
      const updated = { ...v, [field]: value };
      if (field === 'concepto_id') {
        const c = conceptosVales.find((co) => co.id === value);
        updated.concepto_nombre = c?.nombre ?? '';
      }
      return updated;
    }));
  };

  const handleDeleteVale = async (id: string) => {
    const { error } = await supabase.from('est_vales').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    setVales((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSaveVales = async () => {
    setSaving(true);
    try {
      for (const v of vales) {
        const { error } = await supabase.from('est_vales').update({
          concepto_id: v.concepto_id,
          concepto_nombre: v.concepto_nombre,
          valor: v.valor || 0,
          observacion: v.observacion,
        }).eq('id', v.id);
        if (error) throw error;
      }
      await supabase.from('est_cuadre_auditoria').insert({
        cierre_id: cierre.id,
        estacion_id: estacion.id,
        tabla_afectada: 'est_vales',
        campo_modificado: 'valor',
        accion: 'actualizacion_vales',
        usuario: user?.email ?? 'Sistema',
      });
      toast.success('Vales guardados.');
    } catch (err) {
      toast.error('Error al guardar vales.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAjuste = async () => {
    if (!newAjuste.concepto.trim() || !newAjuste.motivo.trim()) {
      toast.error('Concepto y motivo son obligatorios.'); return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('est_ajustes').insert({
        cierre_id: cierre.id,
        estacion_id: estacion.id,
        concepto: newAjuste.concepto.trim(),
        tipo: newAjuste.tipo,
        valor: newAjuste.valor,
        motivo: newAjuste.motivo.trim(),
        created_by: user?.email ?? null,
      }).select('*').single();
      if (error) throw error;
      setAjustes((prev) => [...prev, data as Ajuste]);
      setShowAjusteModal(false);
      setNewAjuste({ concepto: '', tipo: 'negativo', valor: 0, motivo: '' });
      toast.success('Ajuste agregado.');
    } catch (err) {
      toast.error('Error al agregar el ajuste.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAjuste = async (id: string) => {
    const { error } = await supabase.from('est_ajustes').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    setAjustes((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Medios de pago */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Medios de pago del turno</h3>
          </div>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setShowMedioModal(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Configurar medio
            </Button>
          )}
        </div>

        {mediosConfig.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-10 w-10 text-slate-200 mx-auto" />
            <p className="mt-3 text-sm text-slate-500">No hay medios de pago configurados para esta estación.</p>
            {!readOnly && (
              <Button size="sm" className="mt-3 gap-2" onClick={() => setShowMedioModal(true)}>
                <Plus className="h-4 w-4" /> Agregar medio de pago
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {pagos.map((p) => {
                const medio = mediosConfig.find((m) => m.id === p.medio_pago_config_id);
                const tipoIcon = medio?.tipo === 'efectivo' ? Wallet : medio?.tipo === 'tarjeta' ? CreditCard : DollarSign;
                const TipoIcon = tipoIcon;
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
                      <TipoIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{p.medio_pago_nombre}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{medio?.tipo}</p>
                    </div>
                    <div className="w-40 shrink-0">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          value={p.valor || ''}
                          onChange={(e) => handlePagoChange(p.id, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          disabled={readOnly}
                          className="pl-7 text-right font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Total recibido</span>
              <span className="text-lg font-bold text-amber-700">{fmtMoney(totalPagos)}</span>
            </div>
            {!readOnly && (
              <Button onClick={handleSavePagos} disabled={saving} className="mt-3 gap-2 bg-amber-600 hover:bg-amber-700 w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar pagos
              </Button>
            )}
          </>
        )}
      </Card>

      {/* Vales */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">Vales del turno</h3>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">{vales.length}</span>
          </div>
          <div className="flex gap-2">
            {!readOnly && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowValeConceptoModal(true)} className="gap-1.5 text-xs">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Conceptos
                </Button>
                <Button size="sm" variant="outline" onClick={handleAddVale} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Vale
                </Button>
              </>
            )}
          </div>
        </div>

        {vales.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin vales registrados.</p>
        ) : (
          <>
            <div className="space-y-2">
              {vales.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3">
                  <div className="flex-1 min-w-0">
                    <Select
                      value={v.concepto_id ?? ''}
                      onValueChange={(val) => handleUpdateVale(v.id, 'concepto_id', val)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seleccionar concepto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {conceptosVales.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <Input
                        type="number"
                        min={0}
                        value={v.valor || ''}
                        onChange={(e) => handleUpdateVale(v.id, 'valor', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        disabled={readOnly}
                        className="pl-6 text-right text-sm font-semibold h-8"
                      />
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteVale(v.id)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Total vales</span>
              <span className="text-lg font-bold text-violet-700">{fmtMoney(totalVales)}</span>
            </div>
            {!readOnly && (
              <Button onClick={handleSaveVales} disabled={saving} variant="outline" className="mt-3 gap-2 w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar vales
              </Button>
            )}
          </>
        )}
      </Card>

      {/* Ajustes */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Ajustes del turno</h3>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{ajustes.length}</span>
          </div>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setShowAjusteModal(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Ajuste
            </Button>
          )}
        </div>

        {ajustes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin ajustes registrados.</p>
        ) : (
          <div className="space-y-2">
            {ajustes.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg shrink-0 mt-0.5',
                  a.tipo === 'positivo' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                )}>
                  {a.tipo === 'positivo' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{a.concepto}</span>
                    <span className={cn(
                      'text-[10px] font-bold rounded px-1.5 py-0.5',
                      a.tipo === 'positivo' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    )}>
                      {a.tipo === 'positivo' ? '+' : '-'}{fmtMoney(a.valor)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{a.motivo}</p>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => handleDeleteAjuste(a.id)}
                    className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                <span className="text-xs font-semibold text-emerald-700">Ajustes positivos</span>
                <span className="text-sm font-bold text-emerald-700">+{fmtMoney(totalAjustesPos)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                <span className="text-xs font-semibold text-red-700">Ajustes negativos</span>
                <span className="text-sm font-bold text-red-700">-{fmtMoney(totalAjustesNeg)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Medios de pago config modal */}
      <Dialog open={showMedioModal} onOpenChange={(v) => { if (!v) setShowMedioModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><Wallet className="h-4 w-4 text-amber-600" /></span>
              Nuevo medio de pago
            </DialogTitle>
            <DialogDescription>Configura un medio de pago para {estacion.nombre}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nombre *</Label>
              <Input value={newMedio.nombre} onChange={(e) => setNewMedio((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Visa, Efectivo, Transferencia..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Tipo</Label>
              <Select value={newMedio.tipo} onValueChange={(v) => setNewMedio((p) => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="qr">QR</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowMedioModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700" onClick={handleAddMedio} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Agregar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vale concepto modal */}
      <Dialog open={showValeConceptoModal} onOpenChange={(v) => { if (!v) setShowValeConceptoModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50"><Ticket className="h-4 w-4 text-violet-600" /></span>
              Nuevo concepto de vale
            </DialogTitle>
            <DialogDescription>Configura un concepto reutilizable para {estacion.nombre}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nombre *</Label>
              <Input value={newConcepto.nombre} onChange={(e) => setNewConcepto((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: R. Bosque, Calibración, Terpel..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Descripción (opcional)</Label>
              <Input value={newConcepto.descripcion} onChange={(e) => setNewConcepto((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del concepto..." />
            </div>
          </div>
          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowValeConceptoModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700" onClick={handleAddValeConcepto} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Agregar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ajuste modal */}
      <Dialog open={showAjusteModal} onOpenChange={(v) => { if (!v) setShowAjusteModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><SlidersHorizontal className="h-4 w-4 text-blue-600" /></span>
              Nuevo ajuste
            </DialogTitle>
            <DialogDescription>Registra un ajuste justificado para el turno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Concepto *</Label>
              <Input value={newAjuste.concepto} onChange={(e) => setNewAjuste((p) => ({ ...p, concepto: e.target.value }))} placeholder="Ej: Corrección autorizada, diferencia justificada..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Tipo</Label>
                <Select value={newAjuste.tipo} onValueChange={(v) => setNewAjuste((p) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positivo">Positivo (+)</SelectItem>
                    <SelectItem value="negativo">Negativo (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Valor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                  <Input type="number" min={0} value={newAjuste.valor} onChange={(e) => setNewAjuste((p) => ({ ...p, valor: parseFloat(e.target.value) || 0 }))} className="pl-7" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Motivo *</Label>
              <Input value={newAjuste.motivo} onChange={(e) => setNewAjuste((p) => ({ ...p, motivo: e.target.value }))} placeholder="Justificación del ajuste..." />
            </div>
          </div>
          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowAjusteModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleAddAjuste} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Agregar ajuste
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
