import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  TrendingDown,
  RefreshCw,
  Droplets,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateShort, turnoLabel } from '../lib/utils'

interface Alerta {
  tipo: 'error' | 'warning' | 'ok'
  titulo: string
  descripcion: string
  turno?: string
  fecha?: string
  empleado?: string
}

export default function EstValidaciones() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTurnos: 0,
    turnosConFaltante: 0,
    turnosConSobrante: 0,
    turnosCorrectos: 0,
    diferenciaTotal: 0,
  })

  const run = async () => {
    setLoading(true)
    const nuevasAlertas: Alerta[] = []

    const { data: cuadres } = await supabase
      .from('est_cuadres')
      .select('*, turno:est_turnos(empleado, fecha, tipo_turno)')
      .order('created_at', { ascending: false })
      .limit(50)

    let totalFaltante = 0
    let faltantes = 0
    let sobrantes = 0
    let correctos = 0

    ;(cuadres ?? []).forEach((c: any) => {
      if (c.resultado === 'faltante') {
        faltantes++
        totalFaltante += Math.abs(c.diferencia)
        nuevasAlertas.push({
          tipo: 'error',
          titulo: 'Faltante detectado',
          descripcion: `Faltaron ${formatCurrency(Math.abs(c.diferencia))} en el cuadre.`,
          turno: turnoLabel(c.turno?.tipo_turno ?? ''),
          fecha: c.turno?.fecha ? formatDateShort(c.turno.fecha) : '',
          empleado: c.turno?.empleado,
        })
      } else if (c.resultado === 'sobrante') {
        sobrantes++
        nuevasAlertas.push({
          tipo: 'warning',
          titulo: 'Sobrante detectado',
          descripcion: `Sobraron ${formatCurrency(Math.abs(c.diferencia))} en el cuadre.`,
          turno: turnoLabel(c.turno?.tipo_turno ?? ''),
          fecha: c.turno?.fecha ? formatDateShort(c.turno.fecha) : '',
          empleado: c.turno?.empleado,
        })
      } else {
        correctos++
      }
    })

    // Check lecturas inconsistentes
    const { data: lecturas } = await supabase
      .from('est_lecturas')
      .select('*, turno:est_turnos(empleado, fecha)')
      .not('lectura_final', 'is', null)
      .not('lectura_inicial', 'is', null)

    ;(lecturas ?? []).forEach((l: any) => {
      if ((l.lectura_final ?? 0) < (l.lectura_inicial ?? 0)) {
        nuevasAlertas.push({
          tipo: 'error',
          titulo: 'Lectura inconsistente',
          descripcion: `${l.nombre_manguera}: Final (${l.lectura_final}) < Inicial (${l.lectura_inicial}) galones`,
          fecha: l.turno?.fecha ? formatDateShort(l.turno.fecha) : '',
          empleado: l.turno?.empleado,
        })
      }
    })

    // Check turnos pendientes
    const { data: pendientes } = await supabase
      .from('est_turnos')
      .select('*')
      .eq('estado', 'pendiente_aprobacion')

    if ((pendientes ?? []).length > 0) {
      nuevasAlertas.push({
        tipo: 'warning',
        titulo: `${pendientes!.length} turno(s) pendiente(s) de aprobación`,
        descripcion: 'Hay turnos entregados que están esperando revisión del supervisor.',
      })
    }

    if (nuevasAlertas.length === 0) {
      nuevasAlertas.push({
        tipo: 'ok',
        titulo: 'Sin anomalías detectadas',
        descripcion: 'Todos los turnos y lecturas revisados están dentro de los parámetros normales.',
      })
    }

    setAlertas(nuevasAlertas)
    setStats({
      totalTurnos: (cuadres ?? []).length,
      turnosConFaltante: faltantes,
      turnosConSobrante: sobrantes,
      turnosCorrectos: correctos,
      diferenciaTotal: totalFaltante,
    })
    setLoading(false)
  }

  useEffect(() => { run() }, [])

  return (
    <div className="p-4 md:p-6 space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Validaciones</h1>
            <p className="text-sm text-slate-500">Control de calidad y anomalías operativas</p>
          </div>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={run} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
            Cuadres Analizados
          </p>
          <p className="text-2xl font-bold text-slate-800">{stats.totalTurnos}</p>
        </div>
        <div className="card p-4 border-emerald-200 bg-emerald-50">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
            Correctos
          </p>
          <p className="text-2xl font-bold text-emerald-800">{stats.turnosCorrectos}</p>
        </div>
        <div className="card p-4 border-red-200 bg-red-50">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
            <TrendingDown className="w-3.5 h-3.5 inline mr-1" />
            Con Faltante
          </p>
          <p className="text-2xl font-bold text-red-800">{stats.turnosConFaltante}</p>
        </div>
        <div className="card p-4 border-amber-200 bg-amber-50">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Con Sobrante
          </p>
          <p className="text-2xl font-bold text-amber-800">{stats.turnosConSobrante}</p>
        </div>
      </div>

      {stats.diferenciaTotal > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">Faltante total acumulado</p>
            <p className="text-sm text-red-600">{formatCurrency(stats.diferenciaTotal)} en faltantes pendientes de revisión.</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-700 text-sm">Detalle de Alertas</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alertas.map((a, i) => <AlertaRow key={i} alerta={a} />)}
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Reglas de Validación Activas
        </h3>
        <ul className="space-y-2 text-sm">
          {[
            'Lectura final en galones no puede ser menor que la lectura inicial.',
            'No se permite cerrar un turno sin completar todas las lecturas.',
            'No se permite cerrar un turno sin realizar el cuadre de caja.',
            'Cuando existe diferencia en el cuadre, la observación es obligatoria.',
            'Solo se aceptan valores numéricos positivos en las lecturas de galones.',
            'Las lecturas no pueden contener campos vacíos.',
            'El turno debe pasar por revisión del supervisor antes de quedar aprobado.',
            'Los galones vendidos se calculan automáticamente: Final − Inicial.',
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Galones info box */}
      <div className="card p-4 bg-blue-50 border-blue-100">
        <div className="flex items-start gap-3">
          <Droplets className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Unidad de Medida: Galones</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Todo el módulo utiliza galones como unidad estándar, acorde con el sistema de medición
              utilizado por las estaciones de servicio en Colombia.
              Los galones vendidos se calculan automáticamente como la diferencia entre la lectura final e inicial.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertaRow({ alerta }: { alerta: Alerta }) {
  const icon = alerta.tipo === 'ok'
    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
    : alerta.tipo === 'error'
    ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
    : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />

  const bg = alerta.tipo === 'ok' ? 'bg-emerald-50' : alerta.tipo === 'error' ? 'bg-red-50' : 'bg-amber-50'
  const textColor = alerta.tipo === 'ok' ? 'text-emerald-700' : alerta.tipo === 'error' ? 'text-red-700' : 'text-amber-700'

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${bg}`}>
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${textColor}`}>{alerta.titulo}</p>
        <p className="text-sm text-slate-600">{alerta.descripcion}</p>
        {(alerta.empleado || alerta.fecha) && (
          <p className="text-xs text-slate-400 mt-0.5">
            {alerta.empleado && <span>{alerta.empleado}</span>}
            {alerta.empleado && alerta.fecha && <span> · </span>}
            {alerta.fecha && <span>{alerta.fecha}</span>}
            {alerta.turno && <span> · Turno {alerta.turno}</span>}
          </p>
        )}
      </div>
    </div>
  )
}
