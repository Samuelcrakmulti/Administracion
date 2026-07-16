import { useEffect, useState } from 'react'
import {
  History,
  Search,
  Eye,
  Calendar,
  User,
  Loader2,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Droplets,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EstTurno } from '../types/estaciones'
import { formatCurrency, formatNumber, formatDateShort, turnoLabel, estadoTurnoLabel } from '../lib/utils'
import TurnoDetalle from '../components/TurnoDetalle'

export default function EstHistorial() {
  const [turnos, setTurnos] = useState<EstTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterTurno, setFilterTurno] = useState('todos')
  const [detalleId, setDetalleId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('est_turnos')
        .select('*')
        .neq('estado', 'abierto')
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })
      setTurnos(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = turnos.filter((t) => {
    const matchSearch = t.empleado.toLowerCase().includes(search.toLowerCase()) || t.fecha.includes(search)
    const matchEstado = filterEstado === 'todos' || t.estado === filterEstado
    const matchTurno = filterTurno === 'todos' || t.tipo_turno === filterTurno
    return matchSearch && matchEstado && matchTurno
  })

  const totalGalones = filtered.reduce((a, t) => a + (t.total_galones ?? t.total_litros ?? 0), 0)
  const totalVentas = filtered.reduce((a, t) => a + (t.total_ventas ?? 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-5 fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <History className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Historial de Turnos</h1>
          <p className="text-sm text-slate-500">Registro completo de todos los turnos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Turnos" value={String(filtered.length)} />
        <StatCard label="Total Galones" value={`${formatNumber(totalGalones, 0)} gal`} />
        <StatCard label="Total Ventas" value={formatCurrency(totalVentas)} highlight />
        <StatCard label="Promedio/Turno" value={filtered.length > 0 ? formatCurrency(totalVentas / filtered.length) : '$0'} />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" className="input pl-9" placeholder="Buscar empleado o fecha..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select className="input w-44 text-sm" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="pendiente_aprobacion">Pendiente aprobación</option>
            <option value="en_revision">En revisión</option>
            <option value="cerrado">Cerrado</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
          <select className="input w-32 text-sm" value={filterTurno} onChange={(e) => setFilterTurno(e.target.value)}>
            <option value="todos">Todos los turnos</option>
            <option value="manana">Mañana</option>
            <option value="tarde">Tarde</option>
            <option value="noche">Noche</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <History className="w-10 h-10 mb-2 opacity-30" />
            <p className="font-medium">Sin turnos en el historial</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Fecha', 'Empleado', 'Turno', 'Galones Vendidos', 'Ventas', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateShort(t.fecha)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="font-medium text-slate-800">{t.empleado}</span>
                        {t.cargo && <span className="text-xs text-slate-400">— {t.cargo}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TurnoBadge tipo={t.tipo_turno} />
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-700">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5" />
                        {formatNumber(t.total_galones ?? t.total_litros ?? 0, 2)} gal
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                      {formatCurrency(t.total_ventas ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={t.estado} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        onClick={() => setDetalleId(t.id)}>
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalleId && <TurnoDetalle turnoId={detalleId} onClose={() => setDetalleId(null)} />}
    </div>
  )
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card p-4 ${highlight ? 'border-blue-200 bg-blue-50' : ''}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${highlight ? 'text-blue-600' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-xl font-bold font-mono ${highlight ? 'text-blue-800' : 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

function TurnoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, string> = { manana: 'badge-amber', tarde: 'badge-blue', noche: 'badge-slate' }
  return <span className={map[tipo] ?? 'badge-slate'}>{turnoLabel(tipo)}</span>
}

function EstadoBadge({ estado }: { estado: string }) {
  const configs: Record<string, { cls: string; icon: React.ReactNode }> = {
    pendiente_aprobacion: { cls: 'badge-amber', icon: <Clock className="w-3 h-3" /> },
    en_revision: { cls: 'badge-blue', icon: <RotateCcw className="w-3 h-3" /> },
    cerrado: { cls: 'badge-slate', icon: <Clock className="w-3 h-3" /> },
    aprobado: { cls: 'badge-green', icon: <CheckCircle2 className="w-3 h-3" /> },
    rechazado: { cls: 'badge-red', icon: <XCircle className="w-3 h-3" /> },
  }
  const c = configs[estado] ?? { cls: 'badge-slate', icon: null }
  return <span className={c.cls}>{c.icon}{estadoTurnoLabel(estado)}</span>
}
