import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardCheck,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  User,
  Calendar,
  Fuel,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EstTurno } from '../types/estaciones'
import { formatCurrency, formatNumber, formatDateShort, turnoLabel, estadoTurnoLabel } from '../lib/utils'
import TurnoDetalle from '../components/TurnoDetalle'

type AccionModal = { tipo: 'aprobar' | 'rechazar' | 'revisar'; turno: EstTurno } | null

export default function EstAprobacion() {
  const [turnos, setTurnos] = useState<EstTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [accion, setAccion] = useState<AccionModal>(null)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState('pendiente_aprobacion')

  const load = useCallback(async () => {
    setLoading(true)
    const query = supabase
      .from('est_turnos')
      .select('*')
      .order('created_at', { ascending: false })

    if (filterEstado === 'todos') {
      const { data } = await query.neq('estado', 'abierto')
      setTurnos(data ?? [])
    } else {
      const { data } = await query.eq('estado', filterEstado)
      setTurnos(data ?? [])
    }
    setLoading(false)
  }, [filterEstado])

  useEffect(() => { load() }, [load])

  const pendiente = turnos.filter((t) => t.estado === 'pendiente_aprobacion').length
  const enRevision = turnos.filter((t) => t.estado === 'en_revision').length
  const aprobados = turnos.filter((t) => t.estado === 'aprobado').length
  const rechazados = turnos.filter((t) => t.estado === 'rechazado').length

  return (
    <div className="p-4 md:p-6 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Aprobación de Turnos</h1>
            <p className="text-sm text-slate-500">Panel de revisión y aprobación — Supervisor</p>
          </div>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setFilterEstado('pendiente_aprobacion')}
          className={`card p-4 text-left transition-all hover:shadow-md ${filterEstado === 'pendiente_aprobacion' ? 'ring-2 ring-amber-400' : ''}`}>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Pendiente Aprobación</p>
          <p className="text-3xl font-bold text-amber-700">{pendiente}</p>
        </button>
        <button onClick={() => setFilterEstado('en_revision')}
          className={`card p-4 text-left transition-all hover:shadow-md ${filterEstado === 'en_revision' ? 'ring-2 ring-blue-400' : ''}`}>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">En Revisión</p>
          <p className="text-3xl font-bold text-blue-700">{enRevision}</p>
        </button>
        <button onClick={() => setFilterEstado('aprobado')}
          className={`card p-4 text-left transition-all hover:shadow-md ${filterEstado === 'aprobado' ? 'ring-2 ring-emerald-400' : ''}`}>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Aprobados</p>
          <p className="text-3xl font-bold text-emerald-700">{aprobados}</p>
        </button>
        <button onClick={() => setFilterEstado('rechazado')}
          className={`card p-4 text-left transition-all hover:shadow-md ${filterEstado === 'rechazado' ? 'ring-2 ring-red-400' : ''}`}>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Rechazados</p>
          <p className="text-3xl font-bold text-red-700">{rechazados}</p>
        </button>
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtrar:</span>
        {[
          { val: 'pendiente_aprobacion', label: 'Pendientes' },
          { val: 'en_revision', label: 'En revisión' },
          { val: 'aprobado', label: 'Aprobados' },
          { val: 'rechazado', label: 'Rechazados' },
          { val: 'todos', label: 'Todos' },
        ].map(({ val, label }) => (
          <button key={val}
            onClick={() => setFilterEstado(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterEstado === val
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : turnos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <ClipboardCheck className="w-10 h-10 mb-2 opacity-30" />
            <p className="font-medium">No hay turnos en este estado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Empleado', 'Turno', 'Estación', 'Fecha', 'Ventas', 'Galones', 'Diferencia', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {turnos.map((t) => (
                  <TurnoRow
                    key={t.id}
                    turno={t}
                    onVer={() => setDetalleId(t.id)}
                    onAccion={(tipo) => setAccion({ tipo, turno: t })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action modal */}
      {accion && (
        <AccionModal
          accion={accion}
          onClose={() => setAccion(null)}
          onDone={() => { setAccion(null); load() }}
        />
      )}

      {/* Detail modal */}
      {detalleId && <TurnoDetalle turnoId={detalleId} onClose={() => setDetalleId(null)} />}
    </div>
  )
}

// ── Row ────────────────────────────────────────────────────────────────────

function TurnoRow({
  turno, onVer, onAccion,
}: {
  turno: EstTurno
  onVer: () => void
  onAccion: (tipo: 'aprobar' | 'rechazar' | 'revisar') => void
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{turno.empleado}</p>
            {turno.cargo && <p className="text-xs text-slate-400">{turno.cargo}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <TurnoBadge tipo={turno.tipo_turno} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
          <Fuel className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">{turno.estacion_id.slice(0, 8)}…</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {formatDateShort(turno.fecha)}
        </div>
      </td>
      <td className="px-4 py-3 font-mono font-semibold text-blue-700">
        {formatCurrency(turno.total_ventas ?? 0)}
      </td>
      <td className="px-4 py-3 font-mono text-emerald-700">
        {formatNumber(turno.total_galones ?? turno.total_litros ?? 0, 2)} gal
      </td>
      <td className="px-4 py-3">
        <DiferenciaBadge turno={turno} />
      </td>
      <td className="px-4 py-3">
        <EstadoBadge estado={turno.estado} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button onClick={onVer}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Ver detalle">
            <Eye className="w-4 h-4" />
          </button>
          {(turno.estado === 'pendiente_aprobacion' || turno.estado === 'en_revision') && (
            <>
              <button onClick={() => onAccion('aprobar')}
                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Aprobar">
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button onClick={() => onAccion('rechazar')}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Rechazar">
                <XCircle className="w-4 h-4" />
              </button>
              <button onClick={() => onAccion('revisar')}
                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Solicitar revisión">
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Action modal ─────────────────────────────────────────────────────────────

function AccionModal({ accion, onClose, onDone }: { accion: NonNullable<AccionModal>; onClose: () => void; onDone: () => void }) {
  const [supervisor, setSupervisor] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { tipo, turno } = accion

  const config = {
    aprobar: {
      title: 'Aprobar Turno',
      icon: CheckCircle2,
      color: 'emerald',
      notasLabel: 'Observaciones (opcional)',
      notasReq: false,
      btnLabel: 'Aprobar Turno',
    },
    rechazar: {
      title: 'Rechazar Turno',
      icon: XCircle,
      color: 'red',
      notasLabel: 'Motivo del rechazo *',
      notasReq: true,
      btnLabel: 'Rechazar Turno',
    },
    revisar: {
      title: 'Solicitar Revisión',
      icon: RotateCcw,
      color: 'amber',
      notasLabel: 'Qué debe revisarse *',
      notasReq: true,
      btnLabel: 'Solicitar Revisión',
    },
  }[tipo]

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    red: 'bg-red-600 hover:bg-red-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
  }

  const handleConfirm = async () => {
    if (!supervisor.trim()) { setError('El nombre del supervisor es requerido.'); return }
    if (config.notasReq && !notas.trim()) { setError('Este campo es requerido.'); return }
    setSaving(true)
    setError('')
    try {
      const now = new Date().toISOString()
      let updateData: Record<string, string | null> = {}

      if (tipo === 'aprobar') {
        updateData = { estado: 'aprobado', aprobado_por: supervisor, aprobado_at: now, supervisor_observaciones: notas || null }
      } else if (tipo === 'rechazar') {
        updateData = { estado: 'rechazado', rechazado_por: supervisor, rechazado_at: now, supervisor_observaciones: notas }
      } else {
        updateData = { estado: 'en_revision', revisado_por: supervisor, revisado_at: now, supervisor_observaciones: notas }
      }

      const { error: err } = await supabase.from('est_turnos').update(updateData).eq('id', turno.id)
      if (err) throw err
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 text-${config.color}-600`} />
            <h2 className="font-bold text-slate-800">{config.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Turno info */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Empleado</span>
              <span className="font-semibold text-slate-800">{turno.empleado}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Turno</span>
              <span className="font-semibold">{turnoLabel(turno.tipo_turno)} — {formatDateShort(turno.fecha)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ventas</span>
              <span className="font-mono font-semibold text-blue-700">{formatCurrency(turno.total_ventas ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Galones</span>
              <span className="font-mono font-semibold text-emerald-700">{formatNumber(turno.total_galones ?? turno.total_litros ?? 0, 2)} gal</span>
            </div>
          </div>

          {/* Supervisor name */}
          <div>
            <label className="label">Nombre del Supervisor *</label>
            <input type="text" className={`input ${error && !supervisor.trim() ? 'input-error' : ''}`}
              placeholder="Nombre completo del supervisor"
              value={supervisor}
              onChange={(e) => { setSupervisor(e.target.value); setError('') }} />
          </div>

          {/* Notes */}
          <div>
            <label className="label">{config.notasLabel}</label>
            <textarea className={`input resize-none ${error && config.notasReq && !notas.trim() ? 'input-error' : ''}`}
              rows={3}
              placeholder={tipo === 'aprobar' ? 'Observaciones adicionales...' : tipo === 'rechazar' ? 'Explique el motivo del rechazo...' : 'Indique qué información debe revisarse...'}
              value={notas}
              onChange={(e) => { setNotas(e.target.value); setError('') }} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            disabled={saving}
            onClick={handleConfirm}
            className={`${colorMap[config.color]} text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
            {config.btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────────────────────────

function TurnoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, string> = { manana: 'badge-amber', tarde: 'badge-blue', noche: 'badge-slate' }
  return <span className={map[tipo] ?? 'badge-slate'}>{turnoLabel(tipo)}</span>
}

function EstadoBadge({ estado }: { estado: string }) {
  const configs: Record<string, { cls: string; label: string }> = {
    pendiente_aprobacion: { cls: 'badge-amber', label: 'Pendiente aprobación' },
    en_revision: { cls: 'badge-blue', label: 'En revisión' },
    aprobado: { cls: 'badge-green', label: 'Aprobado' },
    rechazado: { cls: 'badge-red', label: 'Rechazado' },
    cerrado: { cls: 'badge-slate', label: 'Cerrado' },
  }
  const c = configs[estado] ?? { cls: 'badge-slate', label: estadoTurnoLabel(estado) }
  return <span className={c.cls}>{c.label}</span>
}

function DiferenciaBadge({ turno }: { turno: EstTurno }) {
  return (
    <span className="text-xs font-mono font-semibold text-slate-500">
      <TrendingUp className="w-3 h-3 inline mr-1" />
      {formatCurrency(turno.total_ventas ?? 0)}
    </span>
  )
}
