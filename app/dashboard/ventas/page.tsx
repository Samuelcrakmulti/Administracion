'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ShoppingCart,
  Calendar,
  Receipt,
  DollarSign,
  Plus,
  Search,
  Eye,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Package,
  AlertTriangle,
  Crown,
  User,
  Users,
  Star,
  Award,
  Sparkles,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  PackageCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { VentaModal } from '@/components/dashboard/venta-modal';
import { cn } from '@/lib/utils';

const PIE_COLORS = [
  'hsl(221 83% 53%)',
  'hsl(160 84% 39%)',
  'hsl(30 80% 55%)',
  'hsl(280 65% 60%)',
  'hsl(340 75% 55%)',
  'hsl(190 85% 40%)',
  'hsl(0 70% 55%)',
];

const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const mesesOpciones = [
  { value: 'all', label: 'Todos los meses' },
  ...mesesNombres.map((n, i) => ({ value: String(i), label: n })),
];

const metodosPagoOpciones = [
  { value: 'all', label: 'Todos los métodos' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Tarjeta', label: 'Tarjeta' },
  { value: 'Transferencia', label: 'Transferencia' },
  { value: 'Otro', label: 'Otro' },
];

const estadosOpciones = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'Completada', label: 'Completada' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Anulada', label: 'Anulada' },
];

type Venta = {
  id: string;
  cliente: string;
  total: number;
  metodo_pago: string;
  estado: string;
  fecha: string;
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

type ProductoInfo = {
  id: string;
  nombre: string;
};

export default function VentasPage() {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [productos, setProductos] = useState<ProductoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewVenta, setViewVenta] = useState<{ venta: Venta; detalles: Detalle[]; productos: Map<string, string> } | null>(null);
  const [stockAlerts, setStockAlerts] = useState<{ nombre: string; cantidad: number; stock_minimo: number }[]>([]);

  // Filters
  const [busqueda, setBusqueda] = useState('');
  const [filtroMes, setFiltroMes] = useState('all');
  const [filtroMetodo, setFiltroMetodo] = useState('all');
  const [filtroEstado, setFiltroEstado] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ventasRes, detallesRes, productosRes] = await Promise.all([
      supabase.from('ventas').select('*').order('fecha', { ascending: false }),
      supabase.from('detalle_venta').select('*'),
      supabase.from('inventario').select('id, nombre'),
    ]);

    if (ventasRes.data) setVentas(ventasRes.data as Venta[]);
    if (detallesRes.data) setDetalles(detallesRes.data as Detalle[]);
    if (productosRes.data) setProductos(productosRes.data as ProductoInfo[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const productoMap = useMemo(() => {
    const m = new Map<string, string>();
    productos.forEach((p) => m.set(p.id, p.nombre));
    return m;
  }, [productos]);

  const detallesByVenta = useMemo(() => {
    const m = new Map<string, Detalle[]>();
    detalles.forEach((d) => {
      const arr = m.get(d.venta_id) || [];
      arr.push(d);
      m.set(d.venta_id, arr);
    });
    return m;
  }, [detalles]);

  // Filtered ventas
  const filtered = useMemo(() => {
    return ventas.filter((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      const mesMatch = filtroMes === 'all' || d.getMonth() === parseInt(filtroMes);
      const metodoMatch = filtroMetodo === 'all' || v.metodo_pago === filtroMetodo;
      const estadoMatch = filtroEstado === 'all' || v.estado === filtroEstado;

      let searchMatch = true;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const inCliente = v.cliente.toLowerCase().includes(q);
        const inFecha = v.fecha.includes(q);
        const inProductos = (detallesByVenta.get(v.id) || []).some(
          (d) => (productoMap.get(d.producto_id) || '').toLowerCase().includes(q)
        );
        searchMatch = inCliente || inFecha || inProductos;
      }

      return mesMatch && metodoMatch && estadoMatch && searchMatch;
    });
  }, [ventas, filtroMes, filtroMetodo, filtroEstado, busqueda, detallesByVenta, productoMap]);

  // Stats — 8 dynamic cards
  const stats = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const ventasHoy = ventas.filter((v) => v.fecha === hoy);
    const ventasMes = ventas.filter((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalGenerado = ventas.reduce((s, v) => s + Number(v.total), 0);

    // Ventas de hoy (valor)
    const ventasHoyValor = ventasHoy.reduce((s, v) => s + Number(v.total), 0);

    // Ventas del mes (valor)
    const ventasMesValor = ventasMes.reduce((s, v) => s + Number(v.total), 0);

    // Numero de ventas
    const numVentas = ventas.length;

    // Clientes unicos
    const clientesUnicos = new Set(ventas.map((v) => v.cliente)).size;

    // Producto mas vendido
    const prodCount = new Map<string, number>();
    detalles.forEach((d) => {
      prodCount.set(d.producto_id, (prodCount.get(d.producto_id) || 0) + d.cantidad);
    });
    let topProducto = '—';
    let topCount = 0;
    prodCount.forEach((count, pid) => {
      if (count > topCount) {
        topCount = count;
        topProducto = productoMap.get(pid) || '—';
      }
    });

    // Ticket promedio
    const ticketPromedio = numVentas > 0 ? totalGenerado / numVentas : 0;

    // Metodo de pago mas utilizado
    const metCount = new Map<string, number>();
    ventas.forEach((v) => {
      metCount.set(v.metodo_pago, (metCount.get(v.metodo_pago) || 0) + 1);
    });
    let topMetodo = '—';
    let topMetCount = 0;
    metCount.forEach((count, met) => {
      if (count > topMetCount) {
        topMetCount = count;
        topMetodo = met;
      }
    });

    // Mejor dia de ventas
    const byDay: Record<string, number> = {};
    ventas.forEach((v) => {
      byDay[v.fecha] = (byDay[v.fecha] || 0) + Number(v.total);
    });
    let mejorDia = '—';
    let mejorDiaValor = 0;
    Object.entries(byDay).forEach(([day, val]) => {
      if (val > mejorDiaValor) {
        mejorDiaValor = val;
        const d = new Date(day + 'T00:00:00');
        mejorDia = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    });

    return {
      ventasHoyValor,
      ventasMesValor,
      numVentas,
      clientesUnicos,
      topProducto,
      ticketPromedio,
      topMetodo,
      mejorDia,
    };
  }, [ventas, detalles, productoMap]);

  // AI Analysis — automatic recommendations
  const aiAnalysis = useMemo(() => {
    const insights: { icon: React.ReactNode; text: string; tone: 'positive' | 'neutral' | 'warning' }[] = [];
    const now = new Date();

    if (ventas.length < 3) return insights;

    // 1. Ventas aumentaron respecto al mes anterior
    const ventasMesActual = ventas.filter((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const mesValorActual = ventasMesActual.reduce((s, v) => s + Number(v.total), 0);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ventasMesPrev = ventas.filter((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
    });
    const mesValorPrev = ventasMesPrev.reduce((s, v) => s + Number(v.total), 0);
    if (mesValorPrev > 0) {
      const cambio = ((mesValorActual - mesValorPrev) / mesValorPrev) * 100;
      if (cambio > 0) {
        insights.push({
          icon: <TrendingUp className="h-4 w-4" />,
          text: `Las ventas aumentaron ${cambio.toFixed(1)}% respecto al mes anterior.`,
          tone: 'positive',
        });
      } else if (cambio < 0) {
        insights.push({
          icon: <TrendingDown className="h-4 w-4" />,
          text: `Las ventas disminuyeron ${Math.abs(cambio).toFixed(1)}% respecto al mes anterior.`,
          tone: 'warning',
        });
      }
    }

    // 2. Producto mas vendido representa el mayor porcentaje de ingresos
    const totalIngresos = ventas.reduce((s, v) => s + Number(v.total), 0);
    const prodRevenue = new Map<string, number>();
    detalles.forEach((d) => {
      prodRevenue.set(d.producto_id, (prodRevenue.get(d.producto_id) || 0) + Number(d.subtotal));
    });
    let topRevId: string | null = null;
    let topRev = 0;
    prodRevenue.forEach((rev, pid) => {
      if (rev > topRev) { topRev = rev; topRevId = pid; }
    });
    if (topRevId && totalIngresos > 0) {
      const pct = (topRev / totalIngresos) * 100;
      const nombre = productoMap.get(topRevId) || '—';
      insights.push({
        icon: <Star className="h-4 w-4" />,
        text: `${nombre} es tu producto con mayor ingresos, representando el ${pct.toFixed(1)}% del total.`,
        tone: pct > 40 ? 'warning' : 'neutral',
      });
    }

    // 3. Productos con baja rotacion
    const allProdIds = new Set(productos.map((p) => p.id));
    const soldProdIds = new Set(detalles.map((d) => d.producto_id));
    const sinRotacion = Array.from(allProdIds).filter((id) => !soldProdIds.has(id));
    if (sinRotacion.length > 0) {
      const nombres = sinRotacion.slice(0, 3).map((id) => productoMap.get(id) || '—').join(', ');
      insights.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `Existen ${sinRotacion.length} producto(s) sin ventas (${nombres}${sinRotacion.length > 3 ? '...' : ''}). Considera promocionarlos.`,
        tone: 'warning',
      });
    }

    // 4. Recomendar aumentar inventario de productos con mayor demanda
    const prodCount = new Map<string, number>();
    detalles.forEach((d) => {
      prodCount.set(d.producto_id, (prodCount.get(d.producto_id) || 0) + d.cantidad);
    });
    const sortedProds = Array.from(prodCount.entries()).sort((a, b) => b[1] - a[1]);
    if (sortedProds.length > 0) {
      const topId = sortedProds[0][0];
      const topNombre = productoMap.get(topId) || '—';
      insights.push({
        icon: <PackageCheck className="h-4 w-4" />,
        text: `Se recomienda aumentar el inventario de ${topNombre}, tu producto con mayor demanda.`,
        tone: 'neutral',
      });
    }

    // 5. Metodo de pago mas utilizado
    const metCount = new Map<string, number>();
    ventas.forEach((v) => {
      metCount.set(v.metodo_pago, (metCount.get(v.metodo_pago) || 0) + 1);
    });
    let topMet = '—';
    let topMetC = 0;
    metCount.forEach((c, m) => { if (c > topMetC) { topMetC = c; topMet = m; } });
    if (topMet !== '—') {
      const pct = (topMetC / ventas.length) * 100;
      insights.push({
        icon: <CreditCard className="h-4 w-4" />,
        text: `El método de pago más utilizado es ${topMet.toLowerCase()}, usado en el ${pct.toFixed(0)}% de las ventas.`,
        tone: 'neutral',
      });
    }

    // 6. Ventas del fin de semana vs promedio
    const weekendVentas = ventas.filter((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      const day = d.getDay();
      return day === 0 || day === 6;
    });
    const weekdayVentas = ventas.filter((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      const day = d.getDay();
      return day !== 0 && day !== 6;
    });
    if (weekendVentas.length > 0 && weekdayVentas.length > 0) {
      const avgWeekend = weekendVentas.reduce((s, v) => s + Number(v.total), 0) / weekendVentas.length;
      const avgWeekday = weekdayVentas.reduce((s, v) => s + Number(v.total), 0) / weekdayVentas.length;
      if (avgWeekend > avgWeekday) {
        const pct = ((avgWeekend - avgWeekday) / avgWeekday) * 100;
        insights.push({
          icon: <Calendar className="h-4 w-4" />,
          text: `Las ventas del fin de semana son ${pct.toFixed(0)}% superiores al promedio de días laborables.`,
          tone: 'positive',
        });
      } else {
        insights.push({
          icon: <Calendar className="h-4 w-4" />,
          text: `Las ventas entre semana superan a las del fin de semana en ${((avgWeekday - avgWeekend) / avgWeekend * 100).toFixed(0)}%.`,
          tone: 'neutral',
        });
      }
    }

    return insights;
  }, [ventas, detalles, productos, productoMap]);

  // Resumen
  const resumen = useMemo(() => {
    const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0);
    const promedio = ventas.length > 0 ? totalVendido / ventas.length : 0;

    // Producto mas vendido
    const prodCount = new Map<string, number>();
    detalles.forEach((d) => {
      prodCount.set(d.producto_id, (prodCount.get(d.producto_id) || 0) + d.cantidad);
    });
    let topProducto = '—';
    let topCount = 0;
    prodCount.forEach((count, pid) => {
      if (count > topCount) {
        topCount = count;
        topProducto = productoMap.get(pid) || '—';
      }
    });

    // Cliente con mas compras
    const cliCount = new Map<string, number>();
    ventas.forEach((v) => {
      cliCount.set(v.cliente, (cliCount.get(v.cliente) || 0) + 1);
    });
    let topCliente = '—';
    let topCliCount = 0;
    cliCount.forEach((count, cli) => {
      if (count > topCliCount) {
        topCliCount = count;
        topCliente = cli;
      }
    });

    // Metodo mas utilizado
    const metCount = new Map<string, number>();
    ventas.forEach((v) => {
      metCount.set(v.metodo_pago, (metCount.get(v.metodo_pago) || 0) + 1);
    });
    let topMetodo = '—';
    let topMetCount = 0;
    metCount.forEach((count, met) => {
      if (count > topMetCount) {
        topMetCount = count;
        topMetodo = met;
      }
    });

    return { totalVendido, promedio, topProducto, topCliente, topMetodo };
  }, [ventas, detalles, productoMap]);

  // Charts
  const chartVentasMes = useMemo(() => {
    const byMonth: Record<string, number> = {};
    ventas.forEach((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      byMonth[key] = (byMonth[key] || 0) + Number(v.total);
    });
    return Object.entries(byMonth)
      .sort((a, b) => {
        const [ay, am] = a[0].split('-').map(Number);
        const [by, bm] = b[0].split('-').map(Number);
        return ay !== by ? ay - by : am - bm;
      })
      .map(([key, val]) => {
        const [, mes] = key.split('-').map(Number);
        return { mes: mesesNombres[mes], total: val };
      });
  }, [ventas]);

  const chartMetodoPago = useMemo(() => {
    const byMet: Record<string, number> = {};
    ventas.forEach((v) => {
      byMet[v.metodo_pago] = (byMet[v.metodo_pago] || 0) + 1;
    });
    return Object.entries(byMet).map(([name, value]) => ({ name, value }));
  }, [ventas]);

  const chartTopProductos = useMemo(() => {
    const prodCount = new Map<string, number>();
    detalles.forEach((d) => {
      prodCount.set(d.producto_id, (prodCount.get(d.producto_id) || 0) + d.cantidad);
    });
    return Array.from(prodCount.entries())
      .map(([pid, count]) => ({ name: productoMap.get(pid) || '—', cantidad: count }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 7);
  }, [detalles, productoMap]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.rpc('eliminar_venta', { p_venta_id: deleteId });
    setDeleteId(null);
    if (error) {
      toast.error('Error al eliminar la venta.');
    } else {
      toast.success('Venta eliminada correctamente. Stock restaurado.');
      fetchData();
    }
  };

  const handleSaved = (stockBajos: { nombre: string; cantidad: number; stock_minimo: number }[]) => {
    fetchData();
    toast.success('Venta registrada correctamente.');
    if (stockBajos.length > 0) {
      setStockAlerts(stockBajos);
      setTimeout(() => {
        stockBajos.forEach((p) => {
          toast.warning(`${p.nombre} quedó con solo ${p.cantidad} unidades. Se recomienda realizar un nuevo pedido.`);
        });
      }, 500);
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getProductosText = (ventaId: string) => {
    const dets = detallesByVenta.get(ventaId) || [];
    if (dets.length === 0) return '—';
    if (dets.length === 1) return productoMap.get(dets[0].producto_id) || '—';
    return `${productoMap.get(dets[0].producto_id) || '—'} +${dets.length - 1} más`;
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ventas</h1>
            <p className="text-sm text-slate-500">
              Gestiona todas las ventas de tu empresa desde un solo lugar.
            </p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)} className="group">
          <Plus className="mr-1.5 h-4 w-4 transition-transform group-hover:rotate-90" />
          Nueva venta
        </Button>
      </div>

      {/* Section: Resumen de Ventas */}
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Resumen de Ventas</h2>
        <p className="text-sm text-slate-500">Indicadores clave de tu actividad de ventas en tiempo real.</p>
      </div>

      {/* 8 Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ventas de Hoy" value={formatCurrency(stats.ventasHoyValor)} icon={<DollarSign className="h-5 w-5" />} color="emerald" />
        <StatCard label="Ventas del Mes" value={formatCurrency(stats.ventasMesValor)} icon={<Calendar className="h-5 w-5" />} color="blue" />
        <StatCard label="Número de Ventas" value={String(stats.numVentas)} icon={<ShoppingCart className="h-5 w-5" />} color="violet" />
        <StatCard label="Clientes Atendidos" value={String(stats.clientesUnicos)} icon={<Users className="h-5 w-5" />} color="sky" />
        <StatCard label="Producto Más Vendido" value={stats.topProducto} icon={<Star className="h-5 w-5" />} color="amber" small />
        <StatCard label="Ticket Promedio" value={formatCurrency(stats.ticketPromedio)} icon={<TrendingUp className="h-5 w-5" />} color="teal" />
        <StatCard label="Método de Pago Principal" value={stats.topMetodo} icon={<CreditCard className="h-5 w-5" />} color="rose" small />
        <StatCard label="Mejor Día de Ventas" value={stats.mejorDia} icon={<Award className="h-5 w-5" />} color="indigo" small />
      </div>

      {/* AI Analysis card */}
      <Card className="mt-6 overflow-hidden border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Análisis Inteligente de Ventas</h2>
            <p className="text-xs text-slate-500">Recomendaciones generadas automáticamente con base en tus datos</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
            <Sparkles className="h-3 w-3" />
            IA
          </span>
        </div>

        {aiAnalysis.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Lightbulb className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 max-w-md text-sm text-slate-500">
              Aún no hay suficiente información para generar recomendaciones. Registra más ventas para obtener análisis personalizados.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {aiAnalysis.map((insight, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-4 transition-colors',
                  insight.tone === 'positive' ? 'border-emerald-200/60 bg-emerald-50/40' :
                  insight.tone === 'warning' ? 'border-amber-200/60 bg-amber-50/40' :
                  'border-slate-200/60 bg-white'
                )}
              >
                <div className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  insight.tone === 'positive' ? 'bg-emerald-100 text-emerald-600' :
                  insight.tone === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-600'
                )}>
                  {insight.icon}
                </div>
                <p className="text-sm leading-relaxed text-slate-700">{insight.text}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Stock alerts */}
      {stockAlerts.length > 0 && (
        <Card className="mt-6 border-amber-200/60 bg-amber-50/40 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Alertas de stock bajo</h2>
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {stockAlerts.length}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stockAlerts.map((p, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-white p-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{p.nombre}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Stock actual: <span className="font-semibold text-slate-700">{p.cantidad}</span>
                    {' · '}Stock mínimo: <span className="font-semibold text-slate-700">{p.stock_minimo}</span>
                  </p>
                  <p className="mt-1 text-xs text-amber-600">Se recomienda realizar un nuevo pedido.</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, producto o fecha..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-full lg:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {mesesOpciones.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
          <SelectTrigger className="w-full lg:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {metodosPagoOpciones.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-full lg:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {estadosOpciones.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table + Resumen */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Table */}
        <Card className="overflow-hidden lg:col-span-2">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <ShoppingCart className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">No hay ventas registradas</p>
                <p className="mt-1 text-xs text-slate-500">Registra tu primera venta con el botón &ldquo;+ Nueva venta&rdquo;</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Fecha', 'Cliente', 'Productos', 'Método', 'Total', 'Estado', 'Acciones'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDate(v.fecha)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{v.cliente}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{getProductosText(v.id)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          <CreditCard className="h-3 w-3" />
                          {v.metodo_pago}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(Number(v.total))}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          v.estado === 'Completada' ? 'bg-emerald-50 text-emerald-600' : v.estado === 'Pendiente' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', v.estado === 'Completada' ? 'bg-emerald-500' : v.estado === 'Pendiente' ? 'bg-amber-500' : 'bg-red-500')} />
                          {v.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              const dets = detallesByVenta.get(v.id) || [];
                              setViewVenta({ venta: v, detalles: dets, productos: productoMap });
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(v.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Resumen de Ventas */}
        <Card className="h-fit p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-slate-900">Resumen de ventas</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Estadísticas generales de tus ventas</p>
          <div className="mt-6 space-y-4">
            <ResumenRow icon={<DollarSign className="h-4 w-4" />} label="Total vendido" value={formatCurrency(resumen.totalVendido)} />
            <ResumenRow icon={<Receipt className="h-4 w-4" />} label="Promedio por venta" value={formatCurrency(resumen.promedio)} />
            <ResumenRow icon={<Crown className="h-4 w-4" />} label="Producto más vendido" value={resumen.topProducto} />
            <ResumenRow icon={<User className="h-4 w-4" />} label="Cliente con más compras" value={resumen.topCliente} />
            <ResumenRow icon={<CreditCard className="h-4 w-4" />} label="Método más utilizado" value={resumen.topMetodo} />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ventas por mes */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">Ventas por mes</h2>
          <p className="mt-1 text-sm text-slate-500">Ingresos mensuales por ventas</p>
          {chartVentasMes.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sin datos suficientes para mostrar</div>
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartVentasMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                  <Bar dataKey="total" name="Ventas" fill="hsl(221 83% 53%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Ventas por metodo de pago */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">Ventas por método de pago</h2>
          <p className="mt-1 text-sm text-slate-500">Distribución de ventas por método</p>
          {chartMetodoPago.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sin datos suficientes para mostrar</div>
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={chartMetodoPago} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                    {chartMetodoPago.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Productos mas vendidos */}
      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold text-slate-900">Productos más vendidos</h2>
        <p className="mt-1 text-sm text-slate-500">Top 7 productos por cantidad vendida</p>
        {chartTopProductos.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sin datos suficientes para mostrar</div>
        ) : (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartTopProductos} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                <Bar dataKey="cantidad" name="Cantidad" fill="hsl(160 84% 39%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Modal */}
      <VentaModal open={modalOpen} onOpenChange={setModalOpen} onSaved={handleSaved} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deseas eliminar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se restaurará el stock de los
              productos y se eliminará el ingreso registrado en Finanzas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View details dialog */}
      <Dialog open={!!viewVenta} onOpenChange={(v) => !v && setViewVenta(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de venta</DialogTitle>
            <DialogDescription>Información completa de la venta seleccionada.</DialogDescription>
          </DialogHeader>
          {viewVenta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailRow label="Cliente" value={viewVenta.venta.cliente} />
                <DetailRow label="Fecha" value={formatDate(viewVenta.venta.fecha)} />
                <DetailRow label="Método de pago" value={viewVenta.venta.metodo_pago} />
                <DetailRow label="Estado" value={viewVenta.venta.estado} />
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Producto</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Cant.</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Precio</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewVenta.detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2 text-sm text-slate-900">{viewVenta.productos.get(d.producto_id) || '—'}</td>
                        <td className="px-3 py-2 text-right text-sm text-slate-600">{d.cantidad}</td>
                        <td className="px-3 py-2 text-right text-sm text-slate-600">{formatCurrency(Number(d.precio_unitario))}</td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">{formatCurrency(Number(d.subtotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">Total</span>
                <span className="text-xl font-bold text-slate-900">{formatCurrency(Number(viewVenta.venta.total))}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon, color, small }: { label: string; value: string; icon: React.ReactNode; color: 'blue' | 'emerald' | 'violet' | 'amber' | 'sky' | 'teal' | 'rose' | 'indigo'; small?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    teal: 'bg-teal-50 text-teal-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <Card className="p-5 transition-shadow hover:shadow-soft-lg">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', colorMap[color])}>{icon}</div>
      <p className={cn('mt-4 font-bold tracking-tight text-slate-900', small ? 'text-base' : 'text-2xl')}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Card>
  );
}

function ResumenRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold text-right text-slate-900">{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value}</p>
    </div>
  );
}
