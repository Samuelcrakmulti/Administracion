'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Download, Loader2, Database, Clock, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
  cargo: string;
  documento: string;
  estado: string;
  fecha_ingreso: string;
  estacion_id: string | null;
  salario: number;
};

type Turno = {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
  estacion_id: string | null;
};

type Asistencia = {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_trabajadas: number | null;
  estado: string;
  estacion_id: string | null;
};

type Estacion = { id: string; nombre: string };

export function ReporteTalento({ estaciones, estacionId }: { estaciones: Estacion[]; estacionId: string }) {
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [asistencia, setAsistencia] = useState<Asistencia[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [empRes, turnosRes, asisRes] = await Promise.all([
        supabase.from('rrhh_empleados').select('*'),
        supabase.from('rrhh_turnos').select('*').order('fecha', { ascending: false }).limit(500),
        supabase.from('rrhh_asistencia').select('*').order('fecha', { ascending: false }).limit(500),
      ]);
      setEmpleados((empRes.data as Empleado[]) ?? []);
      setTurnos((turnosRes.data as Turno[]) ?? []);
      setAsistencia((asisRes.data as Asistencia[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const estMap = useMemo(() => new Map(estaciones.map((e) => [e.id, e.nombre])), [estaciones]);

  const filteredEmpleados = useMemo(() => {
    if (estacionId === 'all') return empleados;
    return empleados.filter((e) => e.estacion_id === estacionId);
  }, [empleados, estacionId]);

  const filteredTurnos = useMemo(() => {
    if (estacionId === 'all') return turnos;
    return turnos.filter((t) => t.estacion_id === estacionId);
  }, [turnos, estacionId]);

  const filteredAsistencia = useMemo(() => {
    if (estacionId === 'all') return asistencia;
    return asistencia.filter((a) => a.estacion_id === estacionId);
  }, [asistencia, estacionId]);

  const stats = useMemo(() => {
    const activos = filteredEmpleados.filter((e) => e.estado === 'activo').length;
    const totalHoras = filteredAsistencia.reduce((s, a) => s + (Number(a.horas_trabajadas) || 0), 0);
    const ausencias = filteredAsistencia.filter((a) => a.estado === 'ausente').length;
    const presentes = filteredAsistencia.filter((a) => a.estado === 'presente').length;
    return { activos, totalTurnos: filteredTurnos.length, totalHoras, ausencias, presentes };
  }, [filteredEmpleados, filteredAsistencia, filteredTurnos]);

  const empMap = useMemo(() => new Map(empleados.map((e) => [e.id, `${e.nombre} ${e.apellido}`])), [empleados]);

  const handleExport = () => {
    const headers = ['Empleado', 'Cargo', 'Estacion', 'Estado', 'Fecha Ingreso', 'Salario'];
    const lines = [headers.join(',')];
    filteredEmpleados.forEach((e) => {
      lines.push([
        `"${e.nombre} ${e.apellido}"`,
        `"${e.cargo}"`,
        `"${estMap.get(e.estacion_id ?? '') ?? 'N/A'}"`,
        e.estado,
        e.fecha_ingreso,
        e.salario,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_talento_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-emerald-50 p-4 text-center"><p className="text-2xl font-bold text-emerald-700">{stats.activos}</p><p className="text-xs text-emerald-600">Empleados activos</p></div>
        <div className="rounded-xl bg-blue-50 p-4 text-center"><p className="text-2xl font-bold text-blue-700">{stats.totalTurnos}</p><p className="text-xs text-blue-600">Turnos registrados</p></div>
        <div className="rounded-xl bg-amber-50 p-4 text-center"><p className="text-2xl font-bold text-amber-700">{stats.totalHoras.toFixed(0)}</p><p className="text-xs text-amber-600">Horas trabajadas</p></div>
        <div className="rounded-xl bg-red-50 p-4 text-center"><p className="text-2xl font-bold text-red-700">{stats.ausencias}</p><p className="text-xs text-red-600">Ausencias</p></div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs"><Download className="h-3.5 w-3.5" />Exportar</Button>
      </div>

      {filteredEmpleados.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-600">No hay empleados registrados</p>
          <p className="mt-1 text-xs text-slate-400">Registra empleados en el módulo de Talento Humano.</p>
        </Card>
      ) : (
        <>
          {/* Employees table */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Empleados</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Nombre</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Cargo</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Estación</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Estado</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmpleados.map((e) => (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700 font-medium">{e.nombre} {e.apellido}</td>
                      <td className="px-3 py-2 text-slate-700">{e.cargo}</td>
                      <td className="px-3 py-2 text-slate-700">{estMap.get(e.estacion_id ?? '') ?? 'N/A'}</td>
                      <td className="px-3 py-2 text-center"><Badge className={e.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 text-[10px]' : 'bg-slate-100 text-slate-500 text-[10px]'}>{e.estado}</Badge></td>
                      <td className="px-3 py-2 text-slate-600">{e.fecha_ingreso ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent shifts */}
          {filteredTurnos.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Turnos recientes</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Empleado</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Estación</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Horario</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTurnos.slice(0, 50).map((t) => (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{t.fecha}</td>
                        <td className="px-3 py-2 text-slate-700">{empMap.get(t.empleado_id) ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{estMap.get(t.estacion_id ?? '') ?? 'N/A'}</td>
                        <td className="px-3 py-2 text-slate-600">{t.hora_inicio} - {t.hora_fin}</td>
                        <td className="px-3 py-2 text-slate-600">{t.tipo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Attendance summary */}
          {filteredAsistencia.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Asistencia reciente</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Empleado</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Entrada</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Salida</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Horas</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAsistencia.slice(0, 50).map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{a.fecha}</td>
                        <td className="px-3 py-2 text-slate-700">{empMap.get(a.empleado_id) ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{a.hora_entrada ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{a.hora_salida ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{a.horas_trabajadas?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-2 text-center"><Badge className={a.estado === 'presente' ? 'bg-emerald-50 text-emerald-700 text-[10px]' : a.estado === 'ausente' ? 'bg-red-50 text-red-700 text-[10px]' : 'bg-amber-50 text-amber-700 text-[10px]'}>{a.estado}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
