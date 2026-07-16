'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, DollarSign, CheckCircle2, Clock, Loader2, Save, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Empleado = { id: string; nombre: string; apellido: string; cargo: string; salario: number; comision_pct: number };
type Nomina = {
  id?: string; empleado_id: string; mes: number; anio: number;
  salario_base: number; horas_extras: number; valor_horas_extras: number;
  bonificaciones: number; comisiones: number; descuentos: number; prestaciones: number;
  total: number; estado: string; finanza_id?: string | null;
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function fmt(v: number) { return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }); }

function calcNomina(emp: Empleado): Omit<Nomina, 'id' | 'estado' | 'finanza_id'> {
  const salario_base = emp.salario;
  const horas_extras = 0;
  const valor_hora = salario_base / 160;
  const valor_horas_extras = horas_extras * valor_hora * 1.25;
  const bonificaciones = 0;
  const comisiones = 0;
  const descuentos = Math.round(salario_base * 0.08);
  const prestaciones = Math.round(salario_base * 0.0933);
  const total = salario_base + valor_horas_extras + bonificaciones + comisiones - descuentos;
  return {
    empleado_id: emp.id, mes: new Date().getMonth() + 1, anio: new Date().getFullYear(),
    salario_base, horas_extras, valor_horas_extras, bonificaciones, comisiones,
    descuentos, prestaciones, total,
  };
}

interface Props { empleados: Empleado[] }

export function NominaPanel({ empleados }: Props) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);

  const fetchNominas = async () => {
    setLoading(true);
    const { data } = await supabase.from('rrhh_nomina').select('*').eq('mes', mes).eq('anio', anio);
    setNominas((data as Nomina[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchNominas(); }, [mes, anio]);

  const changeMes = (d: number) => {
    let nm = mes + d; let na = anio;
    if (nm < 1) { nm = 12; na--; } if (nm > 12) { nm = 1; na++; }
    setMes(nm); setAnio(na);
  };

  const handleGenerar = async () => {
    if (empleados.length === 0) { toast.error('No hay empleados activos.'); return; }
    setProcesando(true);
    try {
      const activos = empleados;
      for (const emp of activos) {
        const existing = nominas.find((n) => n.empleado_id === emp.id);
        if (!existing) {
          const payload = { ...calcNomina(emp), mes, anio, estado: 'pendiente' };
          await supabase.from('rrhh_nomina').insert(payload);
        }
      }
      await fetchNominas();
      toast.success(`Nómina de ${MESES[mes - 1]} ${anio} generada.`);
    } catch (err) {
      toast.error('Error al generar la nómina.'); console.error(err);
    } finally { setProcesando(false); }
  };

  const handlePagar = async (n: Nomina) => {
    if (!n.id) return;
    setPagandoId(n.id);
    try {
      const emp = empleados.find((e) => e.id === n.empleado_id);
      const { data: fin, error: fErr } = await supabase.from('finanzas').insert({
        tipo: 'Gasto', categoria: 'Nómina',
        descripcion: `Nómina ${MESES[n.mes - 1]} ${n.anio} — ${emp?.nombre ?? ''} ${emp?.apellido ?? ''}`,
        valor: n.total, fecha: new Date().toISOString().split('T')[0],
      }).select('id').single();
      if (fErr) throw fErr;
      const { error } = await supabase.from('rrhh_nomina').update({ estado: 'pagado', finanza_id: fin.id }).eq('id', n.id);
      if (error) throw error;
      await fetchNominas();
      toast.success('Pago registrado en Finanzas.');
    } catch (err) {
      toast.error('Error al procesar el pago.'); console.error(err);
    } finally { setPagandoId(null); }
  };

  const updateNomina = async (id: string, field: keyof Nomina, value: number) => {
    const n = nominas.find((x) => x.id === id);
    if (!n) return;
    const updated = { ...n, [field]: value };
    const gross = updated.salario_base + updated.valor_horas_extras + updated.bonificaciones + updated.comisiones;
    updated.total = gross - updated.descuentos;
    setNominas((prev) => prev.map((x) => x.id === id ? updated : x));
    await supabase.from('rrhh_nomina').update(updated).eq('id', id);
  };

  const totalNomina = nominas.reduce((s, n) => s + n.total, 0);
  const pendientes = nominas.filter((n) => n.estado === 'pendiente').length;

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => changeMes(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-32 text-center text-sm font-bold text-slate-900">{MESES[mes - 1]} {anio}</span>
          <Button variant="outline" size="sm" onClick={() => changeMes(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNominas} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Actualizar</Button>
          <Button size="sm" onClick={handleGenerar} disabled={procesando} className="gap-2">
            {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Generar nómina
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{nominas.length}</p>
          <p className="mt-1 text-xs text-slate-500">Empleados en nómina</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
          <p className="mt-1 text-xs text-slate-500">Pagos pendientes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-emerald-600">{fmt(totalNomina)}</p>
          <p className="mt-1 text-xs text-slate-500">Total a pagar</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Liquidación — {MESES[mes - 1]} {anio}</h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
        {nominas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <DollarSign className="h-10 w-10 text-slate-200" />
            <p className="mt-3 text-sm text-slate-500">Sin nómina generada para este período.</p>
            <Button size="sm" className="mt-4 gap-2" onClick={handleGenerar} disabled={procesando}>
              {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}Generar nómina
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Empleado', 'Salario base', 'H. extras', 'Bonif.', 'Comisiones', 'Descuentos', 'TOTAL', 'Estado', 'Acción'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nominas.map((n) => {
                  const emp = empleados.find((e) => e.id === n.empleado_id);
                  const isPagado = n.estado === 'pagado';
                  return (
                    <tr key={n.id} className={cn('transition-colors', isPagado ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50')}>
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-slate-900">{emp?.nombre} {emp?.apellido}</p>
                        <p className="text-xs text-slate-400">{emp?.cargo}</p>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">{fmt(n.salario_base)}</td>
                      <td className="px-3 py-3">
                        {isPagado ? <span className="text-sm text-slate-600">{fmt(n.valor_horas_extras)}</span> : (
                          <Input type="number" min={0} value={n.valor_horas_extras} className="w-24 text-xs"
                            onChange={(e) => n.id && updateNomina(n.id, 'valor_horas_extras', parseFloat(e.target.value) || 0)} />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isPagado ? <span className="text-sm text-slate-600">{fmt(n.bonificaciones)}</span> : (
                          <Input type="number" min={0} value={n.bonificaciones} className="w-24 text-xs"
                            onChange={(e) => n.id && updateNomina(n.id, 'bonificaciones', parseFloat(e.target.value) || 0)} />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isPagado ? <span className="text-sm text-slate-600">{fmt(n.comisiones)}</span> : (
                          <Input type="number" min={0} value={n.comisiones} className="w-24 text-xs"
                            onChange={(e) => n.id && updateNomina(n.id, 'comisiones', parseFloat(e.target.value) || 0)} />
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-red-600">-{fmt(n.descuentos)}</td>
                      <td className="px-3 py-3 text-sm font-bold text-slate-900">{fmt(n.total)}</td>
                      <td className="px-3 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', isPagado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                          {isPagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {!isPagado && n.id && (
                          <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
                            onClick={() => handlePagar(n)} disabled={pagandoId === n.id}>
                            {pagandoId === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Pagar
                          </Button>
                        )}
                        {isPagado && <span className="text-xs text-emerald-600 font-medium">Registrado en Finanzas</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                  <td colSpan={6} className="px-3 py-3 text-sm font-bold text-slate-700 text-right">Total nómina:</td>
                  <td className="px-3 py-3 text-sm font-bold text-slate-900">{fmt(totalNomina)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
