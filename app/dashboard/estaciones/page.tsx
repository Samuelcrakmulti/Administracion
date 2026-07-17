'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Fuel, LayoutDashboard, Building2, Layers, Gauge, Droplet,
  Package, Map, Settings2, ChevronRight, Loader2,
  MapPin, CheckCircle2, AlertTriangle, RefreshCw, Activity,
  History, ClipboardList, BadgeCheck, ShieldCheck,
  Database, Truck, Tag, BarChart3, BellRing, ClipboardCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { EstEstaciones, type Estacion } from '@/components/dashboard/estaciones/est-estaciones';
import { EstProductos, type Producto } from '@/components/dashboard/estaciones/est-productos';
import { EstIslas, type Isla } from '@/components/dashboard/estaciones/est-islas';
import { EstSurtidores, type Surtidor } from '@/components/dashboard/estaciones/est-surtidores';
import { EstMangueras, type Manguera } from '@/components/dashboard/estaciones/est-mangueras';
import { EstMapa } from '@/components/dashboard/estaciones/est-mapa';
import { EstOperacion, type Turno, type Lectura } from '@/components/dashboard/estaciones/est-operacion';
import { EstCuadreForm } from '@/components/dashboard/estaciones/est-cuadre-form';
import { EstEntregaTurno } from '@/components/dashboard/estaciones/est-entrega-turno';
import { EstAprobacion } from '@/components/dashboard/estaciones/est-aprobacion';
import { EstHistorial } from '@/components/dashboard/estaciones/est-historial';
import { EstTanques, type Tanque } from '@/components/dashboard/estaciones/est-tanques';
import { EstInventarioDiario } from '@/components/dashboard/estaciones/est-inventario-diario';
import { EstCarrotanques } from '@/components/dashboard/estaciones/est-carrotanques';
import { EstHistorialInventario } from '@/components/dashboard/estaciones/est-historial-inventario';
import { EstPreciosCombustible } from '@/components/dashboard/estaciones/est-precios-combustible';
import { EstDashboardInventario } from '@/components/dashboard/estaciones/est-dashboard-inventario';
import { EstAlertasInventario } from '@/components/dashboard/estaciones/est-alertas-inventario';

type SectionKey = 'dashboard' | 'operacion' | 'cuadre' | 'entrega' | 'aprobacion' | 'historial' | 'estaciones' | 'islas' | 'surtidores' | 'mangueras' | 'productos' | 'mapa' | 'config' | 'tanques' | 'inv-inicial' | 'inv-final' | 'carrotanques' | 'hist-inventario' | 'precios' | 'dash-inventario' | 'alertas-inventario';

const NAV_GROUPS = [
  {
    label: 'Operación',
    items: [
      { key: 'operacion' as SectionKey, label: 'Operación Diaria', icon: Activity },
      { key: 'cuadre' as SectionKey, label: 'Cuadre de Caja', icon: ClipboardList },
      { key: 'entrega' as SectionKey, label: 'Entrega de Turno', icon: BadgeCheck },
      { key: 'aprobacion' as SectionKey, label: 'Aprobación', icon: ShieldCheck },
      { key: 'historial' as SectionKey, label: 'Historial', icon: History },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { key: 'dash-inventario' as SectionKey, label: 'Dashboard Inventario', icon: BarChart3 },
      { key: 'tanques' as SectionKey, label: 'Tanques', icon: Database },
      { key: 'inv-inicial' as SectionKey, label: 'Inventario Inicial', icon: ClipboardList },
      { key: 'inv-final' as SectionKey, label: 'Inventario Final', icon: ClipboardCheck },
      { key: 'carrotanques' as SectionKey, label: 'Carrotanques', icon: Truck },
      { key: 'hist-inventario' as SectionKey, label: 'Historial Inventario', icon: History },
      { key: 'precios' as SectionKey, label: 'Precios', icon: Tag },
      { key: 'alertas-inventario' as SectionKey, label: 'Alertas', icon: BellRing },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { key: 'dashboard' as SectionKey, label: 'Dashboard', icon: LayoutDashboard },
      { key: 'estaciones' as SectionKey, label: 'Estaciones', icon: Building2 },
      { key: 'islas' as SectionKey, label: 'Islas', icon: Layers },
      { key: 'surtidores' as SectionKey, label: 'Surtidores', icon: Gauge },
      { key: 'mangueras' as SectionKey, label: 'Mangueras', icon: Droplet },
      { key: 'productos' as SectionKey, label: 'Productos', icon: Package },
      { key: 'mapa' as SectionKey, label: 'Mapa de estación', icon: Map },
      { key: 'config' as SectionKey, label: 'Config. avanzada', icon: Settings2 },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

function KpiCard({ value, label, icon, color }: { value: string; label: string; icon: React.ReactNode; color: string }) {
  const cm: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600', slate: 'bg-slate-100 text-slate-600' };
  return (
    <Card className="p-5">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cm[color] || 'bg-slate-100')}>{icon}</div>
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}

const ESTADO_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  abierto: { label: 'Turno activo', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  pendiente_aprobacion: { label: 'Pendiente de aprobación', cls: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500' },
  en_revision: { label: 'En revisión', cls: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500' },
};

export default function EstacionesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SectionKey>('operacion');
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [islas, setIslas] = useState<Isla[]>([]);
  const [surtidores, setSurtidores] = useState<Surtidor[]>([]);
  const [mangueras, setMangueras] = useState<Manguera[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
  const [lecturasActivas, setLecturasActivas] = useState<Lectura[]>([]);
  const [tanques, setTanques] = useState<Tanque[]>([]);

  const selectedEst = estaciones.find((e) => e.id === selectedId) ?? null;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ests }, { data: prods }] = await Promise.all([
        supabase.from('estaciones').select('*').order('created_at'),
        supabase.from('est_productos').select('*').order('nombre'),
      ]);
      const estList = (ests as Estacion[]) ?? [];
      setEstaciones(estList);
      setProductos((prods as Producto[]) ?? []);
      if (!selectedId && estList.length > 0) setSelectedId(estList[0].id);
    } finally { setLoading(false); }
  }, [selectedId]);

  const fetchStation = useCallback(async (stationId: string) => {
    const [{ data: il }, { data: su }, { data: ma }, { data: ta }] = await Promise.all([
      supabase.from('est_islas').select('*').eq('estacion_id', stationId).order('orden'),
      supabase.from('est_surtidores').select('*').eq('estacion_id', stationId).order('numero'),
      supabase.from('est_mangueras').select('*').eq('estacion_id', stationId).order('numero'),
      supabase.from('est_tanques').select('*').eq('estacion_id', stationId).order('created_at'),
    ]);
    setIslas((il as Isla[]) ?? []);
    setSurtidores((su as Surtidor[]) ?? []);
    setMangueras((ma as Manguera[]) ?? []);
    setTanques((ta as Tanque[]) ?? []);
  }, []);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);
  useEffect(() => { if (selectedId) fetchStation(selectedId); }, [selectedId, fetchStation]);

  const handleRefresh = useCallback(async () => {
    await fetchAll();
    if (selectedId) await fetchStation(selectedId);
  }, [fetchAll, fetchStation, selectedId]);

  const handleSelect = (id: string) => { setSelectedId(id); };
  const handleTurnoChange = useCallback((t: Turno | null) => { setTurnoActivo(t); }, []);

  // After cuadre saved → go to entrega
  const handleCuadreGuardado = useCallback(async () => {
    await handleRefresh();
    setActive('entrega');
  }, [handleRefresh]);

  // After entregado → stay on entrega (pending) or refresh
  const handleTurnoEntregado = useCallback(async () => {
    await handleRefresh();
    setActive('entrega');
  }, [handleRefresh]);

  // After supervisor approves/rejects → show aprobacion or historial
  const handleAprobacionDone = useCallback(() => { handleRefresh(); }, [handleRefresh]);

  useEffect(() => {
    if (!turnoActivo) { setLecturasActivas([]); return; }
    supabase.from('est_lecturas').select('*').eq('turno_id', turnoActivo.id)
      .order('orden_isla').order('numero_surtidor').order('numero_manguera')
      .then(({ data }) => setLecturasActivas((data as Lectura[]) ?? []));
  }, [turnoActivo?.id]);

  const surtCount = (id: string) => surtidores.filter((s) => s.isla_id === id).length;

  const turnoEstadoBadge = turnoActivo ? ESTADO_BADGE[turnoActivo.estado] : null;

  const renderContent = () => {
    const needsStation = !['estaciones', 'productos', 'dashboard'].includes(active) && !active.startsWith('dash-inventario') && active !== 'precios';
    if (needsStation && !selectedEst) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <MapPin className="h-12 w-12 text-slate-200" />
          <p className="mt-4 text-base font-semibold text-slate-600">Selecciona una estación</p>
          <Button className="mt-5 gap-2" onClick={() => setActive('estaciones')}><Building2 className="h-4 w-4" />Ir a estaciones</Button>
        </div>
      );
    }

    const noTurnoMsg = (title: string, desc: string) => (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
        <Activity className="h-12 w-12 text-slate-200" />
        <p className="mt-4 text-base font-semibold text-slate-600">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{desc}</p>
        <Button className="mt-5 gap-2 bg-amber-600 hover:bg-amber-700" onClick={() => setActive('operacion')}><Activity className="h-4 w-4" />Ir a Operación Diaria</Button>
      </div>
    );

    switch (active) {
      case 'operacion':
        return selectedEst ? (
          <EstOperacion estacion={selectedEst} islas={islas} surtidores={surtidores} mangueras={mangueras}
            productos={productos} onRefresh={handleRefresh} onTurnoChange={handleTurnoChange} />
        ) : null;

      case 'cuadre':
        if (!selectedEst) return null;
        if (!turnoActivo || !['abierto', 'en_revision'].includes(turnoActivo.estado))
          return noTurnoMsg('Sin turno activo editable', 'Solo puedes hacer el cuadre cuando hay un turno abierto o en revisión.');
        return <EstCuadreForm turno={turnoActivo} lecturas={lecturasActivas} estacionId={selectedEst.id} onGuardado={handleCuadreGuardado} />;

      case 'entrega':
        if (!selectedEst) return null;
        if (!turnoActivo)
          return noTurnoMsg('Sin turno activo', 'Inicia un turno para generar el documento de entrega.');
        return (
          <EstEntregaTurno turno={turnoActivo} lecturas={lecturasActivas} estacion={selectedEst}
            surtidores={surtidores} onEntregado={handleTurnoEntregado} onVolver={() => setActive('cuadre')} />
        );

      case 'aprobacion':
        return selectedEst ? <EstAprobacion estacionId={selectedEst.id} /> : null;

      case 'historial':
        return selectedEst ? <EstHistorial estacionId={selectedEst.id} /> : null;

      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard value={String(estaciones.length)} label="Estaciones" icon={<Fuel className="h-5 w-5" />} color="blue" />
              <KpiCard value={String(islas.length)} label="Islas en estación" icon={<Layers className="h-5 w-5" />} color="emerald" />
              <KpiCard value={String(surtidores.length)} label="Surtidores" icon={<Gauge className="h-5 w-5" />} color="violet" />
              <KpiCard value={String(mangueras.length)} label="Mangueras" icon={<Droplet className="h-5 w-5" />} color="amber" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard value={String(productos.length)} label="Productos" icon={<Package className="h-5 w-5" />} color="slate" />
              <KpiCard value={String(surtidores.filter((s) => s.estado === 'activo').length)} label="Operativos" icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" />
              <KpiCard value={String(surtidores.filter((s) => s.estado === 'mantenimiento').length)} label="Mantenimiento" icon={<AlertTriangle className="h-5 w-5" />} color="amber" />
              <KpiCard value={String(mangueras.filter((m) => m.producto_id).length)} label="M. asignadas" icon={<Droplet className="h-5 w-5" />} color="blue" />
            </div>
            {selectedEst && (
              <Card className="overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Resumen — {selectedEst.nombre}</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setActive('operacion')} className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" />Operar</Button>
                    <Button size="sm" variant="outline" onClick={() => setActive('mapa')} className="gap-1.5 text-xs"><Map className="h-3.5 w-3.5" />Mapa</Button>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[{ l: 'Islas', v: islas.length, c: 'text-blue-600 bg-blue-50' }, { l: 'Surtidores', v: surtidores.length, c: 'text-emerald-600 bg-emerald-50' }, { l: 'Mangueras', v: mangueras.length, c: 'text-violet-600 bg-violet-50' }, { l: 'Sin asignar', v: mangueras.filter((m) => !m.producto_id).length, c: 'text-amber-600 bg-amber-50' }].map((s) => (
                    <div key={s.l} className={cn('rounded-xl p-4 text-center', s.c.split(' ')[1])}>
                      <p className={cn('text-2xl font-bold', s.c.split(' ')[0])}>{s.v}</p>
                      <p className="mt-1 text-xs text-slate-500">{s.l}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        );

      case 'estaciones':
        return <EstEstaciones estaciones={estaciones} onSelect={handleSelect} selectedId={selectedId} onRefresh={handleRefresh}
          islaCount={() => islas.length} surtidorCount={() => surtidores.length} mangueraCount={() => mangueras.length} />;
      case 'islas':
        return selectedEst ? <EstIslas estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} islas={islas}
          surtidorCount={surtCount} mangueraCount={(id) => mangueras.filter((m) => m.isla_id === id).length} onRefresh={handleRefresh} /> : null;
      case 'surtidores':
        return selectedEst ? <EstSurtidores estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} islas={islas}
          surtidores={surtidores} mangueraCount={(id) => mangueras.filter((m) => m.surtidor_id === id).length} onRefresh={handleRefresh} /> : null;
      case 'mangueras':
        return selectedEst ? <EstMangueras estacionId={selectedEst.id} estacionNombre={selectedEst.nombre}
          islas={islas} surtidores={surtidores} mangueras={mangueras} productos={productos} onRefresh={handleRefresh} /> : null;
      case 'productos':
        return <EstProductos productos={productos} onRefresh={handleRefresh} />;
      case 'mapa':
        return selectedEst ? <EstMapa estacion={selectedEst} islas={islas} surtidores={surtidores} mangueras={mangueras} productos={productos} /> : null;
      case 'tanques':
        return selectedEst ? <EstTanques estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} productos={productos} onRefresh={handleRefresh} /> : null;
      case 'inv-inicial':
        return selectedEst ? <EstInventarioDiario estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} tanques={tanques} productos={productos} tipo="inicial" onRefresh={handleRefresh} /> : null;
      case 'inv-final':
        return selectedEst ? <EstInventarioDiario estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} tanques={tanques} productos={productos} tipo="final" onRefresh={handleRefresh} /> : null;
      case 'carrotanques':
        return selectedEst ? <EstCarrotanques estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} tanques={tanques} productos={productos} onRefresh={handleRefresh} /> : null;
      case 'hist-inventario':
        return selectedEst ? <EstHistorialInventario estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} tanques={tanques} productos={productos} /> : null;
      case 'precios':
        return selectedEst ? <EstPreciosCombustible estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} productos={productos} onRefresh={handleRefresh} /> : null;
      case 'dash-inventario':
        return selectedEst ? <EstDashboardInventario estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} tanques={tanques} productos={productos} /> : null;
      case 'alertas-inventario':
        return selectedEst ? <EstAlertasInventario estacionId={selectedEst.id} estacionNombre={selectedEst.nombre} tanques={tanques} productos={productos} /> : null;
      case 'config':
        return (
          <div className="space-y-5">
            <div><h2 className="text-lg font-bold text-slate-900">Configuración avanzada</h2><p className="text-sm text-slate-500">Opciones globales del módulo.</p></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[{ title: 'Numeración automática', desc: 'Genera códigos automáticos al crear islas, surtidores y mangueras.', active: true }, { title: 'Colores por producto', desc: 'Sincroniza el color de la manguera con el color del producto.', active: true }, { title: 'Validación de estructura', desc: 'Alerta cuando hay surtidores sin mangueras o mangueras sin producto.', active: true }, { title: 'Modo multi-estación', desc: 'Gestiona múltiples estaciones desde el mismo panel.', active: true }].map((c, i) => (
                <Card key={i} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-semibold text-slate-900">{c.title}</p><p className="mt-1 text-xs text-slate-500">{c.desc}</p></div>
                    <div className={cn('flex h-6 w-11 shrink-0 items-center rounded-full px-0.5', c.active ? 'bg-blue-600' : 'bg-slate-200')}><span className={cn('h-4 w-4 rounded-full bg-white shadow-sm transition-transform', c.active ? 'translate-x-5' : 'translate-x-0')} /></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-soft"><Fuel className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Estaciones de Servicio</h1>
          <p className="text-sm text-slate-500">Configuración y operación diaria</p>
        </div>
        {turnoActivo && turnoEstadoBadge && (
          <div className={cn('flex items-center gap-2 rounded-full border px-3 py-1', turnoEstadoBadge.cls)}>
            <span className={cn('h-2 w-2 rounded-full', turnoEstadoBadge.dot, turnoActivo.estado === 'abierto' && 'animate-pulse')} />
            <span className="text-xs font-semibold">{turnoActivo.empleado} — {turnoEstadoBadge.label}</span>
          </div>
        )}
        <button onClick={handleRefresh} className="ml-auto rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {/* Station selector */}
      {estaciones.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><MapPin className="h-4 w-4" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Estación seleccionada</p>
            <Select value={selectedId ?? ''} onValueChange={(v) => { setSelectedId(v); fetchStation(v); }}>
              <SelectTrigger className="border-0 p-0 h-auto text-base font-bold text-slate-900 focus:ring-0 shadow-none hover:bg-transparent"><SelectValue placeholder="Seleccionar estación…" /></SelectTrigger>
              <SelectContent>
                {estaciones.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <div className="flex items-center gap-2"><Fuel className="h-4 w-4 text-amber-500" /><span>{e.nombre}</span>{e.ciudad && <span className="text-slate-400 text-xs">— {e.ciudad}</span>}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <span className="font-semibold text-slate-700">{islas.length}</span> islas ·
            <span className="font-semibold text-slate-700">{surtidores.length}</span> surtidores ·
            <span className="font-semibold text-slate-700">{mangueras.length}</span> mangueras
          </div>
        </div>
      )}

      {/* Mobile tabs */}
      <div className="mb-5 overflow-x-auto lg:hidden">
        <div className="flex gap-1.5 pb-1">
          {ALL_NAV.map((n) => (
            <button key={n.key} onClick={() => setActive(n.key)}
              className={cn('inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all', active === n.key ? 'bg-amber-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
              <n.icon className="h-3.5 w-3.5" />{n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-6 space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((n) => (
                    <button key={n.key} onClick={() => setActive(n.key)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                        active === n.key ? 'bg-amber-50 font-semibold text-amber-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                      <n.icon className={cn('h-4 w-4 shrink-0', active === n.key ? 'text-amber-600' : 'text-slate-400')} />
                      <span className="flex-1 text-left">{n.label}</span>
                      {active === n.key && <ChevronRight className="h-3.5 w-3.5 text-amber-500" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div>
          ) : (
            <div className="animate-in fade-in duration-200">{renderContent()}</div>
          )}
        </main>
      </div>
    </div>
  );
}
