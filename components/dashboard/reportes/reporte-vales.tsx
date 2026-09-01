'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Loader2, Database, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';

type Vale = {
  id: string;
  estacion_id: string;
  concepto_id: string | null;
  concepto_nombre: string | null;
  valor: number;
  observacion: string | null;
  created_by: string | null;
  created_at: string;
};

type Concepto = {
  id: string;
  estacion_id: string | null;
  nombre: string;
  descripcion: string | null;
  estado: string;
};

type Estacion = { id: string; nombre: string };

export function ReporteVales({ estaciones, estacionId }: { estaciones: Estacion[]; estacionId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vales, setVales] = useState<Vale[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [showAddConcepto, setShowAddConcepto] = useState(false);
  const [newConcepto, setNewConcepto] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [valesRes, conceptosRes] = await Promise.all([
      supabase.from('est_vales').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('est_vales_conceptos').select('*').order('nombre'),
    ]);
    setVales((valesRes.data as Vale[]) ?? []);
    setConceptos((conceptosRes.data as Concepto[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const estMap = useMemo(() => new Map(estaciones.map((e) => [e.id, e.nombre])), [estaciones]);

  const filtered = useMemo(() => {
    if (estacionId === 'all') return vales;
    return vales.filter((v) => v.estacion_id === estacionId);
  }, [vales, estacionId]);

  const totalVales = filtered.reduce((s, v) => s + (Number(v.valor) || 0), 0);

  const porConcepto = useMemo(() => {
    const map = new Map<string, { nombre: string; total: number; count: number }>();
    filtered.forEach((v) => {
      const nombre = v.concepto_nombre ?? 'Sin concepto';
      const existing = map.get(nombre);
      if (existing) {
        existing.total += Number(v.valor) || 0;
        existing.count += 1;
      } else {
        map.set(nombre, { nombre, total: Number(v.valor) || 0, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const handleAddConcepto = async () => {
    if (!newConcepto.trim()) return;
    const estId = estacionId !== 'all' ? estacionId : null;
    const { error } = await supabase.from('est_vales_conceptos').insert({
      nombre: newConcepto.trim(),
      estacion_id: estId,
      estado: 'activo',
    });
    if (error) {
      toast.error('Error al crear concepto.');
    } else {
      toast.success('Concepto creado.');
      setNewConcepto('');
      setShowAddConcepto(false);
      fetchData();
    }
  };

  const handleExport = () => {
    const headers = ['Fecha', 'Estacion', 'Concepto', 'Valor', 'Observacion', 'Creado por'];
    const lines = [headers.join(',')];
    filtered.forEach((v) => {
      lines.push([
        v.created_at?.split('T')[0] ?? '',
        `"${estMap.get(v.estacion_id) ?? ''}"`,
        `"${v.concepto_nombre ?? ''}"`,
        v.valor,
        `"${v.observacion ?? ''}"`,
        `"${v.created_by ?? ''}"`,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_vales_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl bg-blue-50 p-4 text-center"><p className="text-2xl font-bold text-blue-700">{totalVales.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</p><p className="text-xs text-blue-600">Total vales/ajustes</p></div>
        <div className="rounded-xl bg-slate-100 p-4 text-center"><p className="text-2xl font-bold text-slate-700">{filtered.length}</p><p className="text-xs text-slate-500">Registros</p></div>
        <div className="rounded-xl bg-slate-100 p-4 text-center"><p className="text-2xl font-bold text-slate-700">{conceptos.length}</p><p className="text-xs text-slate-500">Conceptos configurados</p></div>
      </div>

      {/* Configurable concepts */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Conceptos configurados</h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddConcepto(!showAddConcepto)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />Nuevo concepto
          </Button>
        </div>
        {showAddConcepto && (
          <div className="flex gap-2 mb-3">
            <Input value={newConcepto} onChange={(e) => setNewConcepto(e.target.value)} placeholder="Nombre del concepto (ej. R. BOSQUE)" className="h-9 text-sm" />
            <Button size="sm" onClick={handleAddConcepto} className="bg-amber-600 hover:bg-amber-700">Guardar</Button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {conceptos.length === 0 ? (
            <p className="text-xs text-slate-400">No hay conceptos configurados.</p>
          ) : conceptos.map((c) => (
            <span key={c.id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {c.nombre}
              {c.estacion_id && <span className="text-slate-400 ml-1">({estMap.get(c.estacion_id)})</span>}
            </span>
          ))}
        </div>
      </Card>

      {/* By concept summary */}
      {porConcepto.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Resumen por concepto</h3>
          <div className="space-y-2">
            {porConcepto.map((c) => (
              <div key={c.nombre} className="flex items-center gap-3">
                <div className="flex-1 text-sm font-semibold text-slate-700">{c.nombre}</div>
                <div className="text-xs text-slate-500">{c.count} registros</div>
                <div className="text-sm font-bold text-slate-900">{c.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs"><Download className="h-3.5 w-3.5" />Exportar</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-600">No hay vales o ajustes registrados</p>
          <p className="mt-1 text-xs text-slate-400">Los vales y ajustes importados o registrados aparecerán aquí.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Estación</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Concepto</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Valor</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Observación</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{v.created_at?.split('T')[0] ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{estMap.get(v.estacion_id) ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700 font-medium">{v.concepto_nombre ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(v.valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{v.observacion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && <p className="p-3 text-center text-xs text-slate-400">Mostrando 200 de {filtered.length} registros.</p>}
        </div>
      )}
    </div>
  );
}
