'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Brain,
  Activity,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Send,
  User,
  Sparkles,
  Wallet,
  TrendingUp,
  TrendingDown,
  Package,
  PackageX,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Bot,
  CheckCircle2,
  Boxes,
  Target,
  PiggyBank,
  Megaphone,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { callGemini } from '@/lib/gemini';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

type Venta = {
  id: string;
  cliente: string;
  total: number;
  metodo_pago: string;
  estado: string;
  fecha: string;
  created_at: string;
};

type Finanza = {
  id: string;
  tipo: string;
  categoria: string;
  descripcion: string;
  valor: number;
  fecha: string;
};

type Producto = {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  precio_compra: number;
  precio_venta: number;
  cantidad: number;
  stock_minimo: number;
  created_at: string;
};

type Detalle = {
  id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

type Message = {
  role: 'user' | 'ai' | 'error';
  content: string;
};

type TabKey = 'diagnostico' | 'alertas' | 'recomendaciones' | 'chat';

type DiagnosticoData = {
  hayDatos: boolean;
  saludFinanciera: number;
  estadoVentas: number;
  estadoInventario: number;
  crecimiento: number;
  puntajeGeneral: number;
  ingresosMes: number;
  gastosMes: number;
  utilidadMes: number;
  totalProductos: number;
  agotados: number;
  stockBajo: number;
};

const tabs: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: 'diagnostico', label: 'Diagnóstico', icon: Activity },
  { key: 'alertas', label: 'Alertas', icon: AlertTriangle },
  { key: 'recomendaciones', label: 'Recomendaciones', icon: Lightbulb },
  { key: 'chat', label: 'Consultar IA', icon: MessageSquare },
];

export default function CentroInteligentePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('diagnostico');
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [finanzas, setFinanzas] = useState<Finanza[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [v, f, p, d] = await Promise.all([
      supabase.from('ventas').select('*').order('created_at', { ascending: false }),
      supabase.from('finanzas').select('*').order('fecha', { ascending: false }),
      supabase.from('inventario').select('*').order('created_at', { ascending: false }),
      supabase.from('detalle_venta').select('*'),
    ]);
    setVentas((v.data as Venta[]) || []);
    setFinanzas((f.data as Finanza[]) || []);
    setProductos((p.data as Producto[]) || []);
    setDetalles((d.data as Detalle[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // ===== DIAGNÓSTICO =====
  const diagnostico = useMemo<DiagnosticoData>(() => {
    const now = new Date();
    const ventasMes = ventas.filter((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const ingresosMes = ventasMes.reduce((s, v) => s + Number(v.total), 0);
    const gastosMes = finanzas
      .filter((f) => f.tipo === 'Gasto' && new Date(f.fecha + 'T00:00:00').getMonth() === now.getMonth())
      .reduce((s, f) => s + Number(f.valor), 0);
    const utilidadMes = ingresosMes - gastosMes;

    let saludFinanciera = 50;
    if (ingresosMes > 0 || gastosMes > 0) {
      if (ingresosMes > 0 && gastosMes === 0) saludFinanciera = 100;
      else if (ingresosMes > gastosMes) {
        saludFinanciera = Math.min(100, Math.round(50 + (utilidadMes / ingresosMes) * 50));
      } else {
        const deficit = gastosMes > 0 ? (ingresosMes - gastosMes) / gastosMes : -1;
        saludFinanciera = Math.max(0, Math.round(50 + deficit * 50));
      }
    }

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ventasMesPrevValor = ventas
      .filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear(); })
      .reduce((s, v) => s + Number(v.total), 0);

    let estadoVentas = 50;
    if (ventasMesPrevValor > 0) {
      estadoVentas = Math.max(0, Math.min(100, Math.round(50 + ((ingresosMes - ventasMesPrevValor) / ventasMesPrevValor) * 50)));
    } else if (ingresosMes > 0) {
      estadoVentas = 70;
    }

    const totalProductos = productos.length;
    const agotados = productos.filter((p) => p.cantidad <= 0).length;
    const stockBajo = productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo).length;
    const estadoInventario = totalProductos > 0 ? Math.round(((totalProductos - agotados - stockBajo) / totalProductos) * 100) : 0;
    const crecimiento = ventasMesPrevValor > 0 ? ((ingresosMes - ventasMesPrevValor) / ventasMesPrevValor) * 100 : 0;
    const puntajeGeneral = Math.round((saludFinanciera + estadoVentas + estadoInventario) / 3);

    return {
      saludFinanciera, estadoVentas, estadoInventario, crecimiento, puntajeGeneral,
      ingresosMes, gastosMes, utilidadMes, totalProductos, agotados, stockBajo,
      hayDatos: ventas.length > 0 || finanzas.length > 0 || productos.length > 0,
    };
  }, [ventas, finanzas, productos]);

  // ===== ALERTAS =====
  const alertas = useMemo(() => {
    const items: { tipo: string; titulo: string; descripcion: string; icon: typeof AlertTriangle; color: string; bgColor: string }[] = [];
    const now = new Date();

    productos.filter((p) => p.cantidad <= 0).forEach((p) => {
      items.push({ tipo: 'agotado', titulo: p.nombre, descripcion: 'Producto completamente agotado. Requiere reposición urgente.', icon: PackageX, color: 'text-red-600', bgColor: 'bg-red-50' });
    });
    productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo).forEach((p) => {
      items.push({ tipo: 'stock_bajo', titulo: p.nombre, descripcion: `Stock actual: ${p.cantidad} · Stock mínimo: ${p.stock_minimo}. Realiza un nuevo pedido pronto.`, icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50' });
    });

    const gastosMes = finanzas.filter((f) => f.tipo === 'Gasto' && new Date(f.fecha + 'T00:00:00').getMonth() === now.getMonth()).reduce((s, f) => s + Number(f.valor), 0);
    const ingresosMes = ventas.filter((v) => new Date(v.fecha + 'T00:00:00').getMonth() === now.getMonth()).reduce((s, v) => s + Number(v.total), 0);

    if (gastosMes > ingresosMes && gastosMes > 0) {
      items.push({ tipo: 'gastos_altos', titulo: 'Gastos superiores a ingresos', descripcion: `Tus gastos del mes (${formatCurrency(gastosMes)}) superan tus ingresos (${formatCurrency(ingresosMes)}). Reduce gastos urgentemente.`, icon: Wallet, color: 'text-red-600', bgColor: 'bg-red-50' });
    }

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ventasMesPrev = ventas.filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear(); }).reduce((s, v) => s + Number(v.total), 0);
    if (ventasMesPrev > 0 && ingresosMes < ventasMesPrev * 0.7) {
      const caida = ((ventasMesPrev - ingresosMes) / ventasMesPrev) * 100;
      items.push({ tipo: 'ventas_bajan', titulo: 'Disminución de ventas', descripcion: `Las ventas cayeron ${caida.toFixed(0)}% respecto al mes anterior. Revisa tu estrategia comercial.`, icon: TrendingDown, color: 'text-orange-600', bgColor: 'bg-orange-50' });
    }
    return items;
  }, [ventas, finanzas, productos]);

  // ===== RECOMENDACIONES =====
  const recomendaciones = useMemo(() => {
    const recs: { titulo: string; descripcion: string; icon: typeof Lightbulb; color: string; bgColor: string }[] = [];
    const now = new Date();
    if (ventas.length === 0 && productos.length === 0 && finanzas.length === 0) return recs;

    const stockBajoList = productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo);
    if (stockBajoList.length > 0) recs.push({ titulo: 'Comprar inventario', descripcion: `Tienes ${stockBajoList.length} producto(s) con stock bajo. Realiza pedidos de reposición para los de mayor rotación.`, icon: Boxes, color: 'text-blue-600', bgColor: 'bg-blue-50' });

    const gastosMes = finanzas.filter((f) => f.tipo === 'Gasto' && new Date(f.fecha + 'T00:00:00').getMonth() === now.getMonth()).reduce((s, f) => s + Number(f.valor), 0);
    const ingresosMes = ventas.filter((v) => new Date(v.fecha + 'T00:00:00').getMonth() === now.getMonth()).reduce((s, v) => s + Number(v.total), 0);
    if (gastosMes > ingresosMes && gastosMes > 0) recs.push({ titulo: 'Reducir gastos', descripcion: 'Tus gastos superan tus ingresos. Identifica y elimina gastos no esenciales para mejorar tu rentabilidad.', icon: PiggyBank, color: 'text-emerald-600', bgColor: 'bg-emerald-50' });

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ventasMesPrev = ventas.filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear(); }).reduce((s, v) => s + Number(v.total), 0);
    if (ventasMesPrev > 0 && ingresosMes < ventasMesPrev) recs.push({ titulo: 'Aumentar publicidad', descripcion: 'Tus ventas han disminuido respecto al mes anterior. Considera invertir en publicidad o promociones para reactivar las ventas.', icon: Megaphone, color: 'text-violet-600', bgColor: 'bg-violet-50' });

    const margenBajo = productos.filter((p) => Number(p.precio_compra) > 0 && Number(p.precio_venta) > 0 && (Number(p.precio_venta) - Number(p.precio_compra)) / Number(p.precio_compra) < 0.2);
    if (margenBajo.length > 0) recs.push({ titulo: 'Cambiar precios', descripcion: `Tienes ${margenBajo.length} producto(s) con margen inferior al 20%. Ajusta los precios para mejorar la rentabilidad.`, icon: Tag, color: 'text-amber-600', bgColor: 'bg-amber-50' });

    const agotadosList = productos.filter((p) => p.cantidad <= 0);
    if (agotadosList.length > 0) recs.push({ titulo: 'Incrementar stock', descripcion: `${agotadosList.length} producto(s) agotado(s). Reponer el inventario te permitirá recuperar ventas perdidas.`, icon: Package, color: 'text-rose-600', bgColor: 'bg-rose-50' });

    const sinRotacion = productos.filter((p) => !detalles.some((d) => d.producto_id === p.id));
    if (sinRotacion.length > 0) recs.push({ titulo: 'Crear promociones', descripcion: `${sinRotacion.length} producto(s) sin ventas registradas. Crea promociones o descuentos para aumentar su rotación.`, icon: Target, color: 'text-teal-600', bgColor: 'bg-teal-50' });

    return recs;
  }, [ventas, finanzas, productos, detalles]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Centro Inteligente</h1>
          <p className="text-sm text-slate-500">Tu consultor empresarial impulsado por inteligencia artificial</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-primary text-white shadow-soft'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {activeTab === 'diagnostico' && <DiagnosticoSection data={diagnostico} />}
          {activeTab === 'alertas' && <AlertasSection alertas={alertas} />}
          {activeTab === 'recomendaciones' && <RecomendacionesSection recomendaciones={recomendaciones} />}
          {activeTab === 'chat' && <ChatSection ventas={ventas} finanzas={finanzas} productos={productos} detalles={detalles} />}
        </>
      )}
    </div>
  );
}

// ===== DIAGNÓSTICO =====
function DiagnosticoSection({ data }: { data: DiagnosticoData }) {
  if (!data.hayDatos) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Activity className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">Aún no hay suficientes datos</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">El sistema necesita más información para generar un diagnóstico. Registra ventas, gastos y productos para obtener un análisis completo.</p>
      </Card>
    );
  }

  const scoreColor = data.puntajeGeneral >= 70 ? 'text-emerald-600' : data.puntajeGeneral >= 40 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(214 32% 91%)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={data.puntajeGeneral >= 70 ? '#10b981' : data.puntajeGeneral >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(data.puntajeGeneral / 100) * 327} 327`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={cn('text-3xl font-bold', scoreColor)}>{data.puntajeGeneral}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Estado General de la Empresa</h2>
            <p className="mt-1 text-sm text-slate-500">
              {data.puntajeGeneral >= 70 ? 'Tu empresa se encuentra en un estado saludable. Sigue manteniendo buenas prácticas.'
                : data.puntajeGeneral >= 40 ? 'Tu empresa presenta algunas áreas de mejora. Revisa las recomendaciones para optimizar.'
                : 'Tu empresa requiere atención inmediata. Revisa las alertas y recomendaciones.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Ingresos mes', value: formatCurrency(data.ingresosMes), color: '' },
                { label: 'Gastos mes', value: formatCurrency(data.gastosMes), color: '' },
                { label: 'Utilidad', value: formatCurrency(data.utilidadMes), color: data.utilidadMes >= 0 ? 'text-emerald-600' : 'text-red-600' },
                { label: 'Crecimiento', value: `${data.crecimiento >= 0 ? '+' : ''}${data.crecimiento.toFixed(0)}%`, color: data.crecimiento >= 0 ? 'text-emerald-600' : 'text-red-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className={cn('mt-1 text-sm font-bold', s.color || 'text-slate-900')}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <HealthBar label="Salud Financiera" value={data.saludFinanciera} icon={<Wallet className="h-5 w-5" />} color="emerald" />
        <HealthBar label="Estado de Ventas" value={data.estadoVentas} icon={<TrendingUp className="h-5 w-5" />} color="blue" />
        <HealthBar label="Estado del Inventario" value={data.estadoInventario} icon={<Package className="h-5 w-5" />} color="amber" />
      </div>
    </div>
  );
}

function HealthBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'emerald' | 'blue' | 'amber' }) {
  const c = { emerald: { text: 'text-emerald-600', bg: 'bg-emerald-500', light: 'bg-emerald-50' }, blue: { text: 'text-blue-600', bg: 'bg-blue-500', light: 'bg-blue-50' }, amber: { text: 'text-amber-600', bg: 'bg-amber-500', light: 'bg-amber-50' } }[color];
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', c.light, c.text)}>{icon}</div>
        <div className="flex-1"><p className="text-sm font-medium text-slate-700">{label}</p></div>
        <span className={cn('text-xl font-bold', c.text)}>{value}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all duration-1000 ease-out', c.bg)} style={{ width: `${value}%` }} />
      </div>
    </Card>
  );
}

// ===== ALERTAS =====
function AlertasSection({ alertas }: { alertas: { tipo: string; titulo: string; descripcion: string; icon: typeof AlertTriangle; color: string; bgColor: string }[] }) {
  if (alertas.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50"><CheckCircle2 className="h-8 w-8 text-emerald-500" /></div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">Todo en orden</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">No se detectaron alertas en tu negocio. Sigue así.</p>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {alertas.map((a, i) => (
        <Card key={i} className="p-5 transition-shadow hover:shadow-soft-lg">
          <div className="flex items-start gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.bgColor, a.color)}><a.icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{a.titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.descripcion}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ===== RECOMENDACIONES =====
function RecomendacionesSection({ recomendaciones }: { recomendaciones: { titulo: string; descripcion: string; icon: typeof Lightbulb; color: string; bgColor: string }[] }) {
  if (recomendaciones.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"><Lightbulb className="h-8 w-8 text-slate-400" /></div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">Sin recomendaciones por ahora</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">Registra más datos para obtener análisis personalizados.</p>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {recomendaciones.map((r, i) => (
        <Card key={i} className="p-5 transition-all hover:shadow-soft-lg">
          <div className="flex items-start gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', r.bgColor, r.color)}><r.icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{r.titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{r.descripcion}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ===== CHAT =====
function ChatSection({ ventas, finanzas, productos, detalles }: { ventas: Venta[]; finanzas: Finanza[]; productos: Producto[]; detalles: Detalle[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const buildContext = useCallback(() => {
    const now = new Date();
    const ventasMes = ventas.filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const ingresosMes = ventasMes.reduce((s, v) => s + Number(v.total), 0);
    const gastosMes = finanzas.filter((f) => f.tipo === 'Gasto' && new Date(f.fecha + 'T00:00:00').getMonth() === now.getMonth()).reduce((s, f) => s + Number(f.valor), 0);
    const agotados = productos.filter((p) => p.cantidad <= 0);
    const stockBajo = productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo);
    const valorInventario = productos.reduce((s, p) => s + Number(p.precio_venta) * p.cantidad, 0);

    const prodCount = new Map<string, number>();
    detalles.forEach((d) => prodCount.set(d.producto_id, (prodCount.get(d.producto_id) || 0) + d.cantidad));
    let topProducto = 'N/A'; let topCount = 0;
    prodCount.forEach((c, pid) => { if (c > topCount) { topCount = c; topProducto = productos.find((p) => p.id === pid)?.nombre || 'N/A'; } });

    return `Eres un consultor empresarial experto. Responde en español, de forma clara y profesional con consejos específicos y accionables basados en los datos del negocio.

Datos reales del negocio:
- Total de ventas registradas: ${ventas.length}
- Ingresos del mes actual: ${formatCurrency(ingresosMes)}
- Gastos del mes actual: ${formatCurrency(gastosMes)}
- Utilidad del mes: ${formatCurrency(ingresosMes - gastosMes)}
- Total de productos en inventario: ${productos.length}
- Productos agotados: ${agotados.length}${agotados.length > 0 ? ` (${agotados.map((p) => p.nombre).join(', ')})` : ''}
- Productos con stock bajo: ${stockBajo.length}${stockBajo.length > 0 ? ` (${stockBajo.map((p) => p.nombre).join(', ')})` : ''}
- Valor total del inventario: ${formatCurrency(valorInventario)}
- Producto más vendido: ${topProducto} (${topCount} unidades)
- Total de transacciones financieras: ${finanzas.length}`;
  }, [ventas, finanzas, productos, detalles]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    if (!apiKey) {
      setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'error', content: 'NEXT_PUBLIC_GEMINI_API_KEY no está configurada en el archivo .env.' }]);
      return;
    }
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsTyping(true);

    try {
      const context = buildContext();
      const fullPrompt = `${context}\n\nPregunta del usuario: ${text}`;
      const response = await callGemini(apiKey, fullPrompt);
      setMessages((prev) => [...prev, { role: 'ai', content: response }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[CentroInteligente] Error final:', errorMsg);
      setMessages((prev) => [...prev, { role: 'error', content: errorMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedPrompts = [
    '¿Cómo está mi negocio en este momento?',
    '¿Qué productos necesitan reposición?',
    '¿Cómo puedo mejorar mis utilidades?',
  ];

  return (
    <Card className="flex flex-col overflow-hidden p-0" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto bg-slate-50/40 p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
              <Bot className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-700">Consultar IA</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">Pregúntame sobre tu negocio. Tengo acceso a tus datos de ventas, inventario y finanzas para darte recomendaciones personalizadas.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {suggestedPrompts.map((p) => (
                <button key={p} onClick={() => sendMessage(p)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary">{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === 'error') {
            return (
              <div key={i} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="max-w-[85%] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                  <p className="mb-1 font-semibold">Error de la API de Gemini</p>
                  <p className="font-mono text-xs">{msg.content}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft')}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <div className={cn('max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed', msg.role === 'user' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 shadow-soft')}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-soft">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 p-4">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta sobre el negocio..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="submit" disabled={!input.trim() || isTyping} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-soft transition-all hover:bg-blue-600 disabled:opacity-50" aria-label="Enviar">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </Card>
  );
}

function formatCurrency(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}
