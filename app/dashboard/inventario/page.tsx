'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Package,
  Boxes,
  DollarSign,
  AlertTriangle,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  PackageX,
  TrendingUp,
  TrendingDown,
  Crown,
  Tag,
  Star,
  Sparkles,
  Bot,
  Lightbulb,
  PackageCheck,
  AlertCircle,
  ShoppingCart,
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
import {
  ProductoModal,
  type Producto,
} from '@/components/dashboard/producto-modal';
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

type Estado = 'suficiente' | 'bajo' | 'agotado';

function getEstado(p: Producto): Estado {
  if (p.cantidad <= 0) return 'agotado';
  if (p.cantidad <= p.stock_minimo) return 'bajo';
  return 'suficiente';
}

const estadoConfig: Record<Estado, { label: string; dot: string; badge: string }> = {
  suficiente: { label: 'Stock suficiente', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600' },
  bajo: { label: 'Stock bajo', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600' },
  agotado: { label: 'Agotado', dot: 'bg-red-500', badge: 'bg-red-50 text-red-600' },
};

export default function InventarioPage() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewProducto, setViewProducto] = useState<Producto | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [filtroProveedor, setFiltroProveedor] = useState('all');
  const [orden, setOrden] = useState('recientes');

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('inventario').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Error al cargar los productos.');
    } else {
      setProductos((data as Producto[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchProductos();
  }, [user, fetchProductos]);

  const categorias = useMemo(() => Array.from(new Set(productos.map((p) => p.categoria))).sort(), [productos]);
  const proveedores = useMemo(() => Array.from(new Set(productos.map((p) => p.proveedor))).sort(), [productos]);

  const filtered = useMemo(() => {
    let result = productos.filter((p) => {
      const q = busqueda.toLowerCase();
      const searchMatch = !busqueda ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        p.proveedor.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q);
      const catMatch = filtroCategoria === 'all' || p.categoria === filtroCategoria;
      const provMatch = filtroProveedor === 'all' || p.proveedor === filtroProveedor;
      const estMatch = filtroEstado === 'all' || getEstado(p) === filtroEstado;
      return searchMatch && catMatch && provMatch && estMatch;
    });

    switch (orden) {
      case 'mayor_cantidad': result = [...result].sort((a, b) => b.cantidad - a.cantidad); break;
      case 'menor_cantidad': result = [...result].sort((a, b) => a.cantidad - b.cantidad); break;
      case 'mayor_precio': result = [...result].sort((a, b) => b.precio_venta - a.precio_venta); break;
      case 'antiguos': result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'recientes':
      default: result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
    }
    return result;
  }, [productos, busqueda, filtroCategoria, filtroEstado, filtroProveedor, orden]);

  // 8 stat cards
  const stats = useMemo(() => {
    const totalProductos = productos.length;
    const unidades = productos.reduce((s, p) => s + p.cantidad, 0);
    const valorTotal = productos.reduce((s, p) => s + Number(p.precio_venta) * p.cantidad, 0);
    const stockBajo = productos.filter((p) => getEstado(p) !== 'suficiente').length;
    const precioPromedio = totalProductos > 0 ? productos.reduce((s, p) => s + Number(p.precio_venta), 0) / totalProductos : 0;
    const numCategorias = categorias.length;
    const agotados = productos.filter((p) => p.cantidad <= 0).length;
    const mayorValor = productos.length
      ? productos.reduce((max, p) => (Number(p.precio_venta) * p.cantidad > Number(max.precio_venta) * max.cantidad ? p : max))
      : null;
    return { totalProductos, unidades, valorTotal, stockBajo, precioPromedio, numCategorias, agotados, mayorValor };
  }, [productos, categorias]);

  // Resumen
  const resumen = useMemo(() => {
    const valorTotal = productos.reduce((s, p) => s + Number(p.precio_venta) * p.cantidad, 0);
    const masCostoso = productos.length ? productos.reduce((max, p) => (Number(p.precio_venta) > Number(max.precio_venta) ? p : max)) : null;
    const mayorCantidad = productos.length ? productos.reduce((max, p) => (p.cantidad > max.cantidad ? p : max)) : null;
    const menorCantidad = productos.length ? productos.reduce((min, p) => (p.cantidad < min.cantidad ? p : min)) : null;
    const agotados = productos.filter((p) => p.cantidad <= 0).length;
    const stockBajo = productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo).length;
    const catCount = new Map<string, number>();
    productos.forEach((p) => catCount.set(p.categoria, (catCount.get(p.categoria) || 0) + 1));
    let topCat = '—';
    let topCatCount = 0;
    catCount.forEach((c, cat) => { if (c > topCatCount) { topCatCount = c; topCat = cat; } });
    return { total: productos.length, valorTotal, masCostoso, mayorCantidad, menorCantidad, agotados, stockBajo, topCat };
  }, [productos]);

  const alertas = useMemo(() => productos.filter((p) => getEstado(p) !== 'suficiente'), [productos]);

  // Charts
  const chartPorCategoria = useMemo(() => {
    const byCat: Record<string, number> = {};
    productos.forEach((p) => { byCat[p.categoria] = (byCat[p.categoria] || 0) + 1; });
    return Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [productos]);

  const chartValorCategoria = useMemo(() => {
    const byCat: Record<string, number> = {};
    productos.forEach((p) => { byCat[p.categoria] = (byCat[p.categoria] || 0) + Number(p.precio_venta) * p.cantidad; });
    return Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [productos]);

  const chartMenorStock = useMemo(() => {
    return productos
      .filter((p) => p.cantidad > 0)
      .sort((a, b) => a.cantidad - b.cantidad)
      .slice(0, 7)
      .map((p) => ({ name: p.nombre, cantidad: p.cantidad }));
  }, [productos]);

  // AI Analysis
  const aiAnalysis = useMemo(() => {
    const insights: { icon: React.ReactNode; text: string; tone: 'positive' | 'neutral' | 'warning' }[] = [];
    if (productos.length < 3) return insights;

    // 1. Productos con riesgo de agotarse
    const enRiesgo = productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo);
    if (enRiesgo.length > 0) {
      insights.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `Existen ${enRiesgo.length} producto(s) con riesgo de agotarse. Considera realizar pedidos pronto.`,
        tone: 'warning',
      });
    }

    // 2. Productos agotados
    const agotadosList = productos.filter((p) => p.cantidad <= 0);
    if (agotadosList.length > 0) {
      insights.push({
        icon: <AlertCircle className="h-4 w-4" />,
        text: `Tienes ${agotadosList.length} producto(s) completamente agotado(s). Requieren reposición urgente.`,
        tone: 'warning',
      });
    }

    // 3. Productos con mucho stock (posible baja rotacion)
    const altoStock = productos.filter((p) => p.cantidad > p.stock_minimo * 5 && p.stock_minimo > 0);
    if (altoStock.length > 0) {
      const nombres = altoStock.slice(0, 2).map((p) => p.nombre).join(', ');
      insights.push({
        icon: <PackageCheck className="h-4 w-4" />,
        text: `Hay ${altoStock.length} producto(s) con stock muy alto (${nombres}${altoStock.length > 2 ? '...' : ''}). Posible baja rotación.`,
        tone: 'neutral',
      });
    }

    // 4. Valor concentrado en pocas categorias
    if (chartValorCategoria.length > 0) {
      const totalValor = chartValorCategoria.reduce((s, c) => s + c.value, 0);
      const topCat = chartValorCategoria[0];
      if (totalValor > 0) {
        const pct = (topCat.value / totalValor) * 100;
        if (pct > 50) {
          insights.push({
            icon: <Tag className="h-4 w-4" />,
            text: `El valor del inventario está concentrado en "${topCat.name}" (${pct.toFixed(0)}% del total). Diversifica para reducir riesgos.`,
            tone: 'warning',
          });
        }
      }
    }

    // 5. Productos con margen bajo
    const margenBajo = productos.filter((p) => Number(p.precio_compra) > 0 && Number(p.precio_venta) > 0 && (Number(p.precio_venta) - Number(p.precio_compra)) / Number(p.precio_compra) < 0.2);
    if (margenBajo.length > 0) {
      insights.push({
        icon: <DollarSign className="h-4 w-4" />,
        text: `Hay ${margenBajo.length} producto(s) con margen de ganancia inferior al 20%. Se recomienda revisar los precios.`,
        tone: 'neutral',
      });
    }

    // 6. Recomendacion de aumentar stock del producto mas valioso
    if (stats.mayorValor) {
      insights.push({
        icon: <Star className="h-4 w-4" />,
        text: `${stats.mayorValor.nombre} es tu producto con mayor valor en inventario (${formatCurrency(Number(stats.mayorValor.precio_venta) * stats.mayorValor.cantidad)}). Asegúrate de mantener stock suficiente.`,
        tone: 'positive',
      });
    }

    return insights;
  }, [productos, chartValorCategoria, stats.mayorValor]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('inventario').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) {
      toast.error('Error al eliminar el producto.');
    } else {
      toast.success('Producto eliminado correctamente.');
      fetchProductos();
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventario</h1>
            <p className="text-sm text-slate-500">Administra todos los productos de tu empresa desde un solo lugar.</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="group">
          <Plus className="mr-1.5 h-4 w-4 transition-transform group-hover:rotate-90" />
          Agregar Producto
        </Button>
      </div>

      {/* Section: Resumen del Inventario */}
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Resumen del Inventario</h2>
        <p className="text-sm text-slate-500">Indicadores clave de tu inventario en tiempo real.</p>
      </div>

      {/* 8 Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Productos registrados" value={String(stats.totalProductos)} icon={<Package className="h-5 w-5" />} color="blue" />
        <StatCard label="Unidades disponibles" value={stats.unidades.toLocaleString('es-CO')} icon={<Boxes className="h-5 w-5" />} color="emerald" />
        <StatCard label="Valor del inventario" value={formatCurrency(stats.valorTotal)} icon={<DollarSign className="h-5 w-5" />} color="violet" />
        <StatCard label="Productos con stock bajo" value={String(stats.stockBajo)} icon={<AlertTriangle className="h-5 w-5" />} color="amber" />
        <StatCard label="Precio promedio" value={formatCurrency(stats.precioPromedio)} icon={<TrendingUp className="h-5 w-5" />} color="teal" />
        <StatCard label="Categorías registradas" value={String(stats.numCategorias)} icon={<Tag className="h-5 w-5" />} color="sky" />
        <StatCard label="Productos agotados" value={String(stats.agotados)} icon={<AlertCircle className="h-5 w-5" />} color="rose" />
        <StatCard label="Producto con mayor valor" value={stats.mayorValor ? stats.mayorValor.nombre : '—'} icon={<Star className="h-5 w-5" />} color="indigo" small />
      </div>

      {/* AI Analysis card */}
      <Card className="mt-6 overflow-hidden border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Análisis Inteligente del Inventario</h2>
            <p className="text-xs text-slate-500">Recomendaciones generadas automáticamente con base en tus datos</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
            <Sparkles className="h-3 w-3" /> IA
          </span>
        </div>
        {aiAnalysis.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Lightbulb className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 max-w-md text-sm text-slate-500">
              Aún no hay suficiente información para generar recomendaciones inteligentes. Agrega más productos para obtener análisis personalizados.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {aiAnalysis.map((insight, i) => (
              <div key={i} className={cn(
                'flex items-start gap-3 rounded-xl border p-4 transition-colors',
                insight.tone === 'positive' ? 'border-emerald-200/60 bg-emerald-50/40' :
                insight.tone === 'warning' ? 'border-amber-200/60 bg-amber-50/40' :
                'border-slate-200/60 bg-white'
              )}>
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

      {/* Alerts */}
      {alertas.length > 0 && (
        <Card className="mt-6 border-amber-200/60 bg-amber-50/40 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Alertas de Inventario</h2>
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{alertas.length}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {alertas.map((p) => {
              const estado = getEstado(p);
              return (
                <div key={p.id} className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-white p-4">
                  <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', estado === 'agotado' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600')}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{p.nombre}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Stock actual: <span className="font-semibold text-slate-700">{p.cantidad}</span>
                      {' · '}Stock mínimo: <span className="font-semibold text-slate-700">{p.stock_minimo}</span>
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      {estado === 'agotado' ? 'Producto agotado. Requiere reposición urgente.' : 'Realizar un nuevo pedido.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por nombre, código, proveedor o categoría..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-10" />
        </div>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="suficiente">Stock suficiente</SelectItem>
            <SelectItem value="bajo">Stock bajo</SelectItem>
            <SelectItem value="agotado">Agotado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroProveedor} onValueChange={setFiltroProveedor}>
          <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Proveedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {proveedores.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={orden} onValueChange={setOrden}>
          <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recientes">Más recientes</SelectItem>
            <SelectItem value="antiguos">Más antiguos</SelectItem>
            <SelectItem value="mayor_cantidad">Mayor cantidad</SelectItem>
            <SelectItem value="menor_cantidad">Menor cantidad</SelectItem>
            <SelectItem value="mayor_precio">Mayor precio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table + Resumen */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Table */}
        <Card className="overflow-hidden lg:col-span-2">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100"><PackageX className="h-6 w-6 text-slate-400" /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">No hay productos registrados</p>
                <p className="mt-1 text-xs text-slate-500">Agrega tu primer producto con el botón &ldquo;+ Agregar Producto&rdquo;</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Imagen', 'Código', 'Producto', 'Categoría', 'Proveedor', 'Cantidad', 'P. Compra', 'P. Venta', 'Valor Total', 'Estado', 'Acciones'].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const estado = getEstado(p);
                    const cfg = estadoConfig[estado];
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-3 py-3">
                          <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100">
                            {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-slate-300" /></div>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-500">{p.codigo}</td>
                        <td className="px-3 py-3"><p className="text-sm font-medium text-slate-900">{p.nombre}</p></td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600">{p.categoria}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600">{p.proveedor}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-slate-900">{p.cantidad}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-500">{formatCurrency(Number(p.precio_compra))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{formatCurrency(Number(p.precio_venta))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-slate-900">{formatCurrency(Number(p.precio_venta) * p.cantidad)}</td>
                        <td className="px-3 py-3">
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', cfg.badge)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />{cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setViewProducto(p)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Ver detalles"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => { setEditing(p); setModalOpen(true); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteId(p.id)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Resumen del inventario */}
        <Card className="h-fit p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-slate-900">Resumen del Inventario</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Estadísticas generales de tus productos</p>
          <div className="mt-6 space-y-4">
            <ResumenRow icon={<Package className="h-4 w-4" />} label="Total de productos" value={String(resumen.total)} />
            <ResumenRow icon={<DollarSign className="h-4 w-4" />} label="Valor total" value={formatCurrency(resumen.valorTotal)} />
            <ResumenRow icon={<Crown className="h-4 w-4" />} label="Producto más costoso" value={resumen.masCostoso ? `${resumen.masCostoso.nombre} (${formatCurrency(Number(resumen.masCostoso.precio_venta))})` : '—'} />
            <ResumenRow icon={<TrendingUp className="h-4 w-4" />} label="Mayor cantidad" value={resumen.mayorCantidad ? `${resumen.mayorCantidad.nombre} (${resumen.mayorCantidad.cantidad})` : '—'} />
            <ResumenRow icon={<TrendingDown className="h-4 w-4" />} label="Menor cantidad" value={resumen.menorCantidad ? `${resumen.menorCantidad.nombre} (${resumen.menorCantidad.cantidad})` : '—'} />
            <div className="border-t border-slate-100 pt-4">
              <ResumenRow icon={<PackageX className="h-4 w-4" />} label="Productos agotados" value={String(resumen.agotados)} color={resumen.agotados > 0 ? 'text-red-500' : 'text-slate-900'} />
            </div>
            <ResumenRow icon={<AlertTriangle className="h-4 w-4" />} label="Productos con stock bajo" value={String(resumen.stockBajo)} color={resumen.stockBajo > 0 ? 'text-amber-600' : 'text-slate-900'} />
            <ResumenRow icon={<Tag className="h-4 w-4" />} label="Categoría con más productos" value={resumen.topCat} />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Productos por categoria */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">Distribución de productos por categoría</h2>
          <p className="mt-1 text-sm text-slate-500">Cantidad de productos en cada categoría</p>
          {chartPorCategoria.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sin datos suficientes para mostrar</div>
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartPorCategoria} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                  <Bar dataKey="value" name="Productos" fill="hsl(221 83% 53%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Chart 2: Valor economico por categoria */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">Valor económico por categoría</h2>
          <p className="mt-1 text-sm text-slate-500">Valor total del inventario agrupado por categoría</p>
          {chartValorCategoria.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sin datos suficientes para mostrar</div>
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={chartValorCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                    {chartValorCategoria.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Chart 3: Productos con menor stock */}
      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold text-slate-900">Productos con menor stock</h2>
        <p className="mt-1 text-sm text-slate-500">Top 7 productos que requieren atención pronto</p>
        {chartMenorStock.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sin datos suficientes para mostrar</div>
        ) : (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartMenorStock} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                <Bar dataKey="cantidad" name="Stock" fill="hsl(30 80% 55%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Modal */}
      <ProductoModal open={modalOpen} onOpenChange={setModalOpen} editingProducto={editing} onSaved={() => {
        fetchProductos();
        toast.success(editing ? 'Producto actualizado correctamente.' : 'Producto agregado correctamente.');
      }} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deseas eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. El producto se eliminará permanentemente de tu inventario.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View details dialog */}
      <Dialog open={!!viewProducto} onOpenChange={(v) => !v && setViewProducto(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles del producto</DialogTitle>
            <DialogDescription>Información completa del producto seleccionado.</DialogDescription>
          </DialogHeader>
          {viewProducto && (
            <div className="space-y-4">
              {viewProducto.imagen_url && (
                <div className="mx-auto h-32 w-32 overflow-hidden rounded-xl bg-slate-100">
                  <img src={viewProducto.imagen_url} alt={viewProducto.nombre} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailRow label="Nombre" value={viewProducto.nombre} />
                <DetailRow label="Código" value={viewProducto.codigo} />
                <DetailRow label="Categoría" value={viewProducto.categoria} />
                <DetailRow label="Proveedor" value={viewProducto.proveedor} />
                <DetailRow label="Precio compra" value={formatCurrency(Number(viewProducto.precio_compra))} />
                <DetailRow label="Precio venta" value={formatCurrency(Number(viewProducto.precio_venta))} />
                <DetailRow label="Cantidad" value={String(viewProducto.cantidad)} />
                <DetailRow label="Stock mínimo" value={String(viewProducto.stock_minimo)} />
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Descripción</p>
                <p className="mt-1 text-sm text-slate-700">{viewProducto.descripcion}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Estado</span>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', estadoConfig[getEstado(viewProducto)].badge)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', estadoConfig[getEstado(viewProducto)].dot)} />{estadoConfig[getEstado(viewProducto)].label}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon, color, small }: { label: string; value: string; icon: React.ReactNode; color: 'blue' | 'emerald' | 'violet' | 'amber' | 'teal' | 'sky' | 'rose' | 'indigo'; small?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600',
    sky: 'bg-sky-50 text-sky-600',
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

function ResumenRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className={cn('text-sm font-semibold text-right', color || 'text-slate-900')}>{value}</span>
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
