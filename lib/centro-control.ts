import { supabase } from '@/lib/supabase';

export type PeriodKey = 'hoy' | 'ayer' | '7dias' | '30dias' | 'esta_semana' | 'este_mes' | 'mes_anterior' | 'este_anio' | 'anio_anterior' | 'personalizado';

export type Period = {
  key: PeriodKey;
  label: string;
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
};

export function getPeriod(key: PeriodKey, customStart?: string, customEnd?: string): Period {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
  const endOfPrevYear = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];

  const days7 = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const days30 = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

  const periods: Record<PeriodKey, Period> = {
    hoy: { key: 'hoy', label: 'Hoy', start: today, end: today, prevStart: yesterday, prevEnd: yesterday },
    ayer: { key: 'ayer', label: 'Ayer', start: yesterday, end: yesterday, prevStart: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0], prevEnd: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0] },
    '7dias': { key: '7dias', label: 'Últimos 7 días', start: days7, end: today, prevStart: new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0], prevEnd: new Date(now.getTime() - 8 * 86400000).toISOString().split('T')[0] },
    '30dias': { key: '30dias', label: 'Últimos 30 días', start: days30, end: today, prevStart: new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0], prevEnd: new Date(now.getTime() - 31 * 86400000).toISOString().split('T')[0] },
    esta_semana: { key: 'esta_semana', label: 'Esta semana', start: startOfWeek.toISOString().split('T')[0], end: today, prevStart: new Date(startOfWeek.getTime() - 7 * 86400000).toISOString().split('T')[0], prevEnd: new Date(startOfWeek.getTime() - 86400000).toISOString().split('T')[0] },
    este_mes: { key: 'este_mes', label: 'Este mes', start: startOfMonth, end: today, prevStart: startOfPrevMonth, prevEnd: endOfPrevMonth },
    mes_anterior: { key: 'mes_anterior', label: 'Mes anterior', start: startOfPrevMonth, end: endOfPrevMonth, prevStart: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0], prevEnd: new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString().split('T')[0] },
    este_anio: { key: 'este_anio', label: 'Este año', start: startOfYear, end: today, prevStart: startOfPrevYear, prevEnd: endOfPrevYear },
    anio_anterior: { key: 'anio_anterior', label: 'Año anterior', start: startOfPrevYear, end: endOfPrevYear, prevStart: new Date(now.getFullYear() - 2, 0, 1).toISOString().split('T')[0], prevEnd: new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0] },
    personalizado: { key: 'personalizado', label: 'Personalizado', start: customStart ?? today, end: customEnd ?? today, prevStart: '', prevEnd: '' },
  };

  return periods[key];
}

export type EstacionInfo = { id: string; nombre: string; ciudad: string | null };

export type KpiData = {
  ventas: number;
  galones: number;
  ingresos: number;
  gastos: number;
  utilidad: number;
  inventarioGalones: number;
  cuadresCorrectos: number;
  cuadresConDiferencia: number;
  faltantesTotal: number;
  sobrantesTotal: number;
  tanquesNormales: number;
  tanquesBajos: number;
  tanquesCriticos: number;
  carrotanquesGalones: number;
  carrotanquesCount: number;
  empleadosActivos: number;
  parqueaderoIngresos: number;
  parqueaderoVehiculos: number;
  prevVentas: number;
  prevGalones: number;
  prevIngresos: number;
  prevGastos: number;
};

export async function fetchKpis(estacionId: string | null, period: Period): Promise<KpiData> {
  const { start, end, prevStart, prevEnd } = period;
  const stationFilter = estacionId ? `estacion_id.eq.${estacionId}` : null;

  // Fetch lecturas for galones and sales
  let lecturasQuery = supabase.from('est_lecturas').select('galones_vendidos, nombre_producto, fecha, cierre_id').gte('fecha', start).lte('fecha', end);
  if (estacionId) lecturasQuery = lecturasQuery.eq('estacion_id', estacionId);
  const { data: lecturas } = await lecturasQuery;

  const galones = (lecturas ?? []).reduce((s, l) => s + (Number(l.galones_vendidos) || 0), 0);

  // Fetch cuadres for sales amounts and differences
  let cuadreQuery = supabase.from('est_cuadres').select('ventas_esperadas, diferencia, resultado, estado_cuadre').gte('created_at', start).lte('created_at', end + 'T23:59:59');
  if (estacionId) cuadreQuery = cuadreQuery.eq('estacion_id', estacionId);
  const { data: cuadres } = await cuadreQuery;

  const ventas = (cuadres ?? []).reduce((s, c) => s + Number(c.ventas_esperadas) || 0, 0);
  const cuadresCorrectos = (cuadres ?? []).filter((c) => c.resultado === 'cuadrado' || c.resultado === 'dentro_tolerancia').length;
  const cuadresConDiferencia = (cuadres ?? []).filter((c) => c.resultado === 'faltante' || c.resultado === 'sobrante').length;
  const faltantesTotal = (cuadres ?? []).filter((c) => c.resultado === 'faltante').reduce((s, c) => s + Math.abs(Number(c.diferencia) || 0), 0);
  const sobrantesTotal = (cuadres ?? []).filter((c) => c.resultado === 'sobrante').reduce((s, c) => s + Math.abs(Number(c.diferencia) || 0), 0);

  // Fetch tanques for inventory status
  let tanqueQuery = supabase.from('est_tanques').select('nivel_actual_galones, nivel_alerta_galones, nivel_critico_galones, capacidad_maxima_galones, estado');
  if (estacionId) tanqueQuery = tanqueQuery.eq('estacion_id', estacionId);
  const { data: tanques } = await tanqueQuery;

  const inventarioGalones = (tanques ?? []).reduce((s, t) => s + (Number(t.nivel_actual_galones) || 0), 0);
  const tanquesNormales = (tanques ?? []).filter((t) => {
    const nivel = Number(t.nivel_actual_galones) || 0;
    const alerta = Number(t.nivel_alerta_galones) || 0;
    return t.estado === 'activo' && (alerta === 0 || nivel > alerta);
  }).length;
  const tanquesBajos = (tanques ?? []).filter((t) => {
    const nivel = Number(t.nivel_actual_galones) || 0;
    const alerta = Number(t.nivel_alerta_galones) || 0;
    const critico = Number(t.nivel_critico_galones) || 0;
    return t.estado === 'activo' && alerta > 0 && nivel <= alerta && (critico === 0 || nivel > critico);
  }).length;
  const tanquesCriticos = (tanques ?? []).filter((t) => {
    const nivel = Number(t.nivel_actual_galones) || 0;
    const critico = Number(t.nivel_critico_galones) || 0;
    return t.estado === 'activo' && critico > 0 && nivel <= critico;
  }).length;

  // Fetch carrotanques
  let carrotQuery = supabase.from('est_carrotanques').select('cantidad_galones, fecha').gte('fecha', start).lte('fecha', end);
  if (estacionId) carrotQuery = carrotQuery.eq('estacion_id', estacionId);
  const { data: carrots } = await carrotQuery;

  const carrotanquesGalones = (carrots ?? []).reduce((s, c) => s + (Number(c.cantidad_galones) || 0), 0);
  const carrotanquesCount = carrots?.length ?? 0;

  // Fetch finances
  const { data: finanzas } = await supabase.from('finanzas').select('tipo, valor, fecha').gte('fecha', start).lte('fecha', end);
  const ingresos = (finanzas ?? []).filter((f) => f.tipo === 'Ingreso').reduce((s, f) => s + Number(f.valor), 0);
  const gastos = (finanzas ?? []).filter((f) => f.tipo === 'Gasto').reduce((s, f) => s + Number(f.valor), 0);

  // Fetch empleados
  const { count: empleadosActivos } = await supabase.from('empleados').select('*', { count: 'exact', head: true }).eq('estado', 'activo');

  // Fetch parqueadero
  let parqQuery = supabase.from('parqueadero_registros').select('total_pagado, fecha_ingreso').gte('fecha_ingreso', start).lte('fecha_ingreso', end);
  const { data: parq } = await parqQuery;
  const parqueaderoIngresos = (parq ?? []).reduce((s, p) => s + (Number(p.total_pagado) || 0), 0);
  const parqueaderoVehiculos = parq?.length ?? 0;

  // Previous period for comparison
  let prevVentas = 0, prevGalones = 0, prevIngresos = 0, prevGastos = 0;
  if (prevStart && prevEnd) {
    let prevLecQ = supabase.from('est_lecturas').select('galones_vendidos').gte('fecha', prevStart).lte('fecha', prevEnd);
    if (estacionId) prevLecQ = prevLecQ.eq('estacion_id', estacionId);
    const { data: prevLec } = await prevLecQ;
    prevGalones = (prevLec ?? []).reduce((s, l) => s + (Number(l.galones_vendidos) || 0), 0);

    let prevCuaQ = supabase.from('est_cuadres').select('ventas_esperadas').gte('created_at', prevStart).lte('created_at', prevEnd + 'T23:59:59');
    if (estacionId) prevCuaQ = prevCuaQ.eq('estacion_id', estacionId);
    const { data: prevCua } = await prevCuaQ;
    prevVentas = (prevCua ?? []).reduce((s, c) => s + (Number(c.ventas_esperadas) || 0), 0);

    const { data: prevFin } = await supabase.from('finanzas').select('tipo, valor').gte('fecha', prevStart).lte('fecha', prevEnd);
    prevIngresos = (prevFin ?? []).filter((f) => f.tipo === 'Ingreso').reduce((s, f) => s + Number(f.valor), 0);
    prevGastos = (prevFin ?? []).filter((f) => f.tipo === 'Gasto').reduce((s, f) => s + Number(f.valor), 0);
  }

  return {
    ventas, galones, ingresos, gastos, utilidad: ingresos - gastos,
    inventarioGalones, cuadresCorrectos, cuadresConDiferencia, faltantesTotal, sobrantesTotal,
    tanquesNormales, tanquesBajos, tanquesCriticos,
    carrotanquesGalones, carrotanquesCount,
    empleadosActivos: empleadosActivos ?? 0,
    parqueaderoIngresos, parqueaderoVehiculos,
    prevVentas, prevGalones, prevIngresos, prevGastos,
  };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

export type EstacionRanking = {
  id: string;
  nombre: string;
  ventas: number;
  galones: number;
  inventario: number;
  diferencias: number;
  tanquesBajos: number;
};

export async function fetchEstacionRanking(period: Period): Promise<EstacionRanking[]> {
  const { data: estaciones } = await supabase.from('estaciones').select('id, nombre').order('created_at');
  if (!estaciones) return [];

  const rankings: EstacionRanking[] = [];
  for (const est of estaciones) {
    const kpis = await fetchKpis(est.id, period);
    rankings.push({
      id: est.id,
      nombre: est.nombre,
      ventas: kpis.ventas,
      galones: kpis.galones,
      inventario: kpis.inventarioGalones,
      diferencias: kpis.cuadresConDiferencia,
      tanquesBajos: kpis.tanquesBajos + kpis.tanquesCriticos,
    });
  }
  return rankings.sort((a, b) => b.ventas - a.ventas);
}

export type AlertaItem = {
  id: string;
  tipo: 'inventario_critico' | 'inventario_bajo' | 'cuadre_faltante' | 'cuadre_sobrante' | 'venta_caida' | 'gastos_altos';
  prioridad: 'critica' | 'alta' | 'media' | 'baja';
  modulo: string;
  titulo: string;
  descripcion: string;
  estacionNombre: string | null;
  fecha: string;
};

export async function fetchAlertas(estacionId: string | null): Promise<AlertaItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const alertas: AlertaItem[] = [];

  // Tank alerts
  let tanqueQ = supabase.from('est_tanques').select('id, nombre, nivel_actual_galones, nivel_alerta_galones, nivel_critico_galones, estacion_id, producto_id, estado');
  if (estacionId) tanqueQ = tanqueQ.eq('estacion_id', estacionId);
  const { data: tanques } = await tanqueQ;
  const { data: estaciones } = await supabase.from('estaciones').select('id, nombre');
  const estMap = new Map((estaciones ?? []).map((e) => [e.id, e.nombre]));
  const { data: productos } = await supabase.from('est_productos').select('id, nombre');
  const prodMap = new Map((productos ?? []).map((p) => [p.id, p.nombre]));

  (tanques ?? []).forEach((t) => {
    if (t.estado !== 'activo') return;
    const nivel = Number(t.nivel_actual_galones) || 0;
    const critico = Number(t.nivel_critico_galones) || 0;
    const alerta = Number(t.nivel_alerta_galones) || 0;
    const prodName = prodMap.get(t.producto_id) ?? 'Combustible';
    const estName = estMap.get(t.estacion_id) ?? null;

    if (critico > 0 && nivel <= critico) {
      alertas.push({
        id: `tank-crit-${t.id}`, tipo: 'inventario_critico', prioridad: 'critica', modulo: 'Inventario',
        titulo: `Tanque ${t.nombre} en nivel crítico`,
        descripcion: `El tanque de ${prodName} (${t.nombre}) está en ${nivel.toFixed(0)} galones, por debajo del nivel crítico (${critico.toFixed(0)} gal). Se recomienda abastecimiento inmediato.`,
        estacionNombre: estName, fecha: today,
      });
    } else if (alerta > 0 && nivel <= alerta) {
      alertas.push({
        id: `tank-low-${t.id}`, tipo: 'inventario_bajo', prioridad: 'alta', modulo: 'Inventario',
        titulo: `Tanque ${t.nombre} con nivel bajo`,
        descripcion: `El tanque de ${prodName} (${t.nombre}) está en ${nivel.toFixed(0)} galones, por debajo del nivel de alerta (${alerta.toFixed(0)} gal).`,
        estacionNombre: estName, fecha: today,
      });
    }
  });

  // Cuadre alerts (last 7 days)
  const hace7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  let cuadreQ = supabase.from('est_cuadres').select('id, diferencia, resultado, estado_cuadre, estacion_id, created_at').gte('created_at', hace7);
  if (estacionId) cuadreQ = cuadreQ.eq('estacion_id', estacionId);
  const { data: cuadres } = await cuadreQ;

  (cuadres ?? []).forEach((c) => {
    const diff = Math.abs(Number(c.diferencia) || 0);
    const estName = estMap.get(c.estacion_id) ?? null;
    if (c.resultado === 'faltante' && diff > 0) {
      alertas.push({
        id: `cuadre-falt-${c.id}`, tipo: 'cuadre_faltante', prioridad: diff > 50000 ? 'alta' : 'media', modulo: 'Cuadres',
        titulo: `Faltante de ${diff.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}`,
        descripcion: `Turno con faltante de $${diff.toLocaleString('es-CO')}. Requiere revisión.`,
        estacionNombre: estName, fecha: c.created_at?.split('T')[0] ?? today,
      });
    } else if (c.resultado === 'sobrante' && diff > 0) {
      alertas.push({
        id: `cuadre-sobr-${c.id}`, tipo: 'cuadre_sobrante', prioridad: 'media', modulo: 'Cuadres',
        titulo: `Sobrante de ${diff.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}`,
        descripcion: `Turno con sobrante de $${diff.toLocaleString('es-CO')}. Verificar origen.`,
        estacionNombre: estName, fecha: c.created_at?.split('T')[0] ?? today,
      });
    }
  });

  // Sort by priority
  const prioOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
  alertas.sort((a, b) => prioOrder[a.prioridad] - prioOrder[b.prioridad]);

  return alertas;
}

export type ProductSales = { nombre: string; galones: number; ventas: number; color: string };

export async function fetchProductSales(estacionId: string | null, period: Period): Promise<ProductSales[]> {
  let q = supabase.from('est_lecturas').select('producto_id, nombre_producto, galones_vendidos').gte('fecha', period.start).lte('fecha', period.end);
  if (estacionId) q = q.eq('estacion_id', estacionId);
  const { data: lecturas } = await q;

  const { data: productos } = await supabase.from('est_productos').select('id, nombre, color');
  const prodMap = new Map((productos ?? []).map((p) => [p.id, p]));

  let qPrecios = supabase.from('est_precios_combustible').select('producto_id, precio_galon, fecha_inicio, activo').eq('activo', true);
  const { data: precios } = await qPrecios;
  const precioMap = new Map<number, number>();
  (precios ?? []).forEach((p) => {
    const pid = p.producto_id as unknown as number;
    if (!precioMap.has(pid)) precioMap.set(pid, Number(p.precio_galon));
  });

  const map: Record<string, ProductSales> = {};
  (lecturas ?? []).forEach((l) => {
    const nombre = l.nombre_producto ?? prodMap.get(l.producto_id as unknown as string)?.nombre ?? 'N/A';
    if (!map[nombre]) {
      const prod = prodMap.get(l.producto_id as unknown as string);
      map[nombre] = { nombre, galones: 0, ventas: 0, color: prod?.color ?? '#94a3b8' };
    }
    map[nombre].galones += Number(l.galones_vendidos) || 0;
    const precio = precioMap.get(l.producto_id as unknown as number) ?? 0;
    map[nombre].ventas += (Number(l.galones_vendidos) || 0) * precio;
  });

  return Object.values(map).sort((a, b) => b.galones - a.galones);
}

export type DailyData = { fecha: string; galones: number; ventas: number; entradas: number };

export async function fetchDailyData(estacionId: string | null, period: Period): Promise<DailyData[]> {
  const days: Record<string, DailyData> = {};
  const start = new Date(period.start);
  const end = new Date(period.end);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    days[key] = { fecha: key.slice(5), galones: 0, ventas: 0, entradas: 0 };
  }

  let lecQ = supabase.from('est_lecturas').select('fecha, galones_vendidos').gte('fecha', period.start).lte('fecha', period.end);
  if (estacionId) lecQ = lecQ.eq('estacion_id', estacionId);
  const { data: lecturas } = await lecQ;
  (lecturas ?? []).forEach((l) => { if (days[l.fecha]) days[l.fecha].galones += Number(l.galones_vendidos) || 0; });

  let carQ = supabase.from('est_carrotanques').select('fecha, cantidad_galones').gte('fecha', period.start).lte('fecha', period.end);
  if (estacionId) carQ = carQ.eq('estacion_id', estacionId);
  const { data: carrots } = await carQ;
  (carrots ?? []).forEach((c) => { if (days[c.fecha]) days[c.fecha].entradas += Number(c.cantidad_galones) || 0; });

  let cuaQ = supabase.from('est_cuadres').select('ventas_esperadas, created_at').gte('created_at', period.start).lte('created_at', period.end + 'T23:59:59');
  if (estacionId) cuaQ = cuaQ.eq('estacion_id', estacionId);
  const { data: cuadres } = await cuaQ;
  (cuadres ?? []).forEach((c) => {
    const fecha = c.created_at?.split('T')[0];
    if (fecha && days[fecha]) days[fecha].ventas += Number(c.ventas_esperadas) || 0;
  });

  return Object.values(days);
}
