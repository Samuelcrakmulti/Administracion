'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Receipt,
  Calendar,
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
  MovimientoModal,
  type Movimiento,
} from '@/components/dashboard/movimiento-modal';
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

const mesesNombres = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const mesesOpciones = [
  { value: 'all', label: 'Todos los meses' },
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
];

const tipoOpciones = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'Ingreso', label: 'Ingreso' },
  { value: 'Gasto', label: 'Gasto' },
];

export default function FinanzasPage() {
  const { user } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Movimiento | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [filtroMes, setFiltroMes] = useState('all');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [busqueda, setBusqueda] = useState('');

  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finanzas')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      toast.error('Error al cargar los movimientos.');
    } else {
      setMovimientos((data as Movimiento[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchMovimientos();
  }, [user, fetchMovimientos]);

  // Unique categories from data
  const categoriasDisponibles = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.categoria));
    return Array.from(set).sort();
  }, [movimientos]);

  // Filtered movements
  const filtered = useMemo(() => {
    return movimientos.filter((m) => {
      const mesMatch =
        filtroMes === 'all' ||
        new Date(m.fecha + 'T00:00:00').getMonth() === parseInt(filtroMes);
      const tipoMatch = filtroTipo === 'all' || m.tipo === filtroTipo;
      const catMatch =
        filtroCategoria === 'all' || m.categoria === filtroCategoria;
      const searchMatch =
        !busqueda ||
        m.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      return mesMatch && tipoMatch && catMatch && searchMatch;
    });
  }, [movimientos, filtroMes, filtroTipo, filtroCategoria, busqueda]);

  // Stats from ALL data (not filtered)
  const stats = useMemo(() => {
    const ingresos = movimientos
      .filter((m) => m.tipo === 'Ingreso')
      .reduce((sum, m) => sum + Number(m.valor), 0);
    const gastos = movimientos
      .filter((m) => m.tipo === 'Gasto')
      .reduce((sum, m) => sum + Number(m.valor), 0);
    const utilidad = ingresos - gastos;

    const now = new Date();
    const mesActual = now.getMonth();
    const anioActual = now.getFullYear();
    const mesMovs = movimientos.filter((m) => {
      const d = new Date(m.fecha + 'T00:00:00');
      return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    });
    const ingresosMes = mesMovs
      .filter((m) => m.tipo === 'Ingreso')
      .reduce((s, m) => s + Number(m.valor), 0);
    const gastosMes = mesMovs
      .filter((m) => m.tipo === 'Gasto')
      .reduce((s, m) => s + Number(m.valor), 0);
    const balanceMes = ingresosMes - gastosMes;

    return { ingresos, gastos, utilidad, balanceMes };
  }, [movimientos]);

  // Summary from filtered data
  const resumen = useMemo(() => {
    const ingresos = filtered
      .filter((m) => m.tipo === 'Ingreso')
      .reduce((s, m) => s + Number(m.valor), 0);
    const gastos = filtered
      .filter((m) => m.tipo === 'Gasto')
      .reduce((s, m) => s + Number(m.valor), 0);
    return {
      ingresos,
      gastos,
      utilidad: ingresos - gastos,
      count: filtered.length,
    };
  }, [filtered]);

  // Bar chart: Ingresos vs Gastos por mes
  const barData = useMemo(() => {
    const byMonth: Record<string, { ingresos: number; gastos: number }> = {};
    movimientos.forEach((m) => {
      const d = new Date(m.fecha + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!byMonth[key]) byMonth[key] = { ingresos: 0, gastos: 0 };
      if (m.tipo === 'Ingreso') byMonth[key].ingresos += Number(m.valor);
      else byMonth[key].gastos += Number(m.valor);
    });
    return Object.entries(byMonth)
      .sort((a, b) => {
        const [ay, am] = a[0].split('-').map(Number);
        const [by, bm] = b[0].split('-').map(Number);
        return ay !== by ? ay - by : am - bm;
      })
      .map(([key, val]) => {
        const [, mes] = key.split('-').map(Number);
        return {
          mes: mesesNombres[mes],
          Ingresos: val.ingresos,
          Gastos: val.gastos,
        };
      });
  }, [movimientos]);

  // Pie chart: Gastos por categoria
  const pieData = useMemo(() => {
    const byCat: Record<string, number> = {};
    movimientos
      .filter((m) => m.tipo === 'Gasto')
      .forEach((m) => {
        byCat[m.categoria] = (byCat[m.categoria] || 0) + Number(m.valor);
      });
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [movimientos]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('finanzas').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) {
      toast.error('Error al eliminar el movimiento.');
    } else {
      toast.success('Movimiento eliminado correctamente.');
      fetchMovimientos();
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    });

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gestión Financiera
            </h1>
            <p className="text-sm text-slate-500">
              Administra todos los ingresos y gastos de tu empresa.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="group"
        >
          <Plus className="mr-1.5 h-4 w-4 transition-transform group-hover:rotate-90" />
          Nuevo movimiento
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ingresos Totales"
          value={formatCurrency(stats.ingresos)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          label="Gastos Totales"
          value={formatCurrency(stats.gastos)}
          icon={<ArrowDownRight className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          label="Utilidad"
          value={formatCurrency(stats.utilidad)}
          icon={<TrendingUp className="h-5 w-5" />}
          color={stats.utilidad >= 0 ? 'blue' : 'red'}
        />
        <StatCard
          label="Balance del mes"
          value={formatCurrency(stats.balanceMes)}
          icon={<Wallet className="h-5 w-5" />}
          color={stats.balanceMes >= 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mesesOpciones.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tipoOpciones.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categoriasDisponibles.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table + Summary */}
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
                <Receipt className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  No hay movimientos registrados
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Crea tu primer movimiento con el botón &ldquo;+ Nuevo
                  movimiento&rdquo;
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Valor', 'Acciones'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {formatDate(m.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                            m.tipo === 'Ingreso'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-red-50 text-red-600'
                          )}
                        >
                          {m.tipo === 'Ingreso' ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {m.tipo}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {m.categoria}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {m.descripcion}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-4 py-3 text-sm font-semibold',
                          m.tipo === 'Ingreso'
                            ? 'text-emerald-600'
                            : 'text-red-500'
                        )}
                      >
                        {m.tipo === 'Ingreso' ? '+' : '−'}
                        {formatCurrency(Number(m.valor))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditing(m);
                              setModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(m.id)}
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

        {/* Resumen financiero */}
        <Card className="h-fit p-6">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-slate-900">
              Resumen financiero
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Calculado según los filtros aplicados
          </p>

          <div className="mt-6 space-y-4">
            <ResumenRow
              label="Total ingresos"
              value={formatCurrency(resumen.ingresos)}
              color="text-emerald-600"
            />
            <ResumenRow
              label="Total gastos"
              value={formatCurrency(resumen.gastos)}
              color="text-red-500"
            />
            <div className="border-t border-slate-100 pt-4">
              <ResumenRow
                label="Utilidad"
                value={formatCurrency(resumen.utilidad)}
                color={
                  resumen.utilidad >= 0 ? 'text-slate-900' : 'text-red-500'
                }
                bold
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">
                Movimientos registrados
              </span>
              <span className="text-lg font-bold text-slate-900">
                {resumen.count}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar chart */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Ingresos vs Gastos por mes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Comparación mensual de tus finanzas
          </p>
          {barData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Sin datos suficientes para mostrar
            </div>
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(214 32% 91%)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      `$${(v / 1000000).toFixed(1)}M`
                    }
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(214 32% 91%)',
                      fontSize: '13px',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Bar
                    dataKey="Ingresos"
                    fill="hsl(160 84% 39%)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="Gastos"
                    fill="hsl(30 80% 55%)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Pie chart */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Distribución de gastos por categoría
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            En qué categorías gastas más
          </p>
          {pieData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Sin gastos registrados para mostrar
            </div>
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(214 32% 91%)',
                      fontSize: '13px',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      <MovimientoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingMovimiento={editing}
        onSaved={() => {
          fetchMovimientos();
          toast.success(
            editing
              ? 'Movimiento actualizado correctamente.'
              : 'Movimiento guardado correctamente.'
          );
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deseas eliminar este movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento se eliminará
              permanentemente de tus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'emerald' | 'red' | 'blue';
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <Card className="p-5 transition-shadow hover:shadow-soft-lg">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            colorMap[color]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Card>
  );
}

function ResumenRow({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={cn('text-sm', bold ? 'font-bold' : 'font-semibold', color)}>
        {value}
      </span>
    </div>
  );
}
