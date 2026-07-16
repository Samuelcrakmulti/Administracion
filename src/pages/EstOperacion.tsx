import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Play,
  StopCircle,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Fuel,
  Hash,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Estacion, EstTurno, EstLectura, EstCuadre } from '../types/estaciones'
import {
  formatCurrency,
  formatNumber,
  getCurrentDate,
  getCurrentTime,
  turnoLabel,
} from '../lib/utils'
import EstCuadreForm from '../components/EstCuadreForm'
import EstEntregaTurno from '../components/EstEntregaTurno'

type Step = 'inicio' | 'form-turno' | 'lecturas-iniciales' | 'lecturas-finales' | 'cuadre' | 'entrega-turno'

export default function EstOperacion() {
  const [estacion, setEstacion] = useState<Estacion | null>(null)
  const [turnoActivo, setTurnoActivo] = useState<EstTurno | null>(null)
  const [lecturas, setLecturas] = useState<EstLectura[]>([])
  const [cuadre, setCuadre] = useState<EstCuadre | null>(null)
  const [step, setStep] = useState<Step>('inicio')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formTurno, setFormTurno] = useState({
    empleado: '',
    cargo: '',
    tipo_turno: 'manana' as 'manana' | 'tarde' | 'noche',
    fecha: getCurrentDate(),
    hora_inicio: getCurrentTime(),
    hora_fin_estimada: '',
    observaciones: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [inicialesInput, setInicialesInput] = useState<Record<string, string>>({})
  const [inicialesErrors, setInicialesErrors] = useState<Record<string, string>>({})
  const [finalesInput, setFinalesInput] = useState<Record<string, string>>({})
  const [finalesErrors, setFinalesErrors] = useState<Record<string, string>>({})

  const loadLecturas = async (turnoId: string) => {
    const { data } = await supabase
      .from('est_lecturas')
      .select('*')
      .eq('turno_id', turnoId)
      .order('orden_isla', { ascending: true })
    setLecturas(data ?? [])
    return data ?? []
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: estData, error: estErr } = await supabase
        .from('estaciones')
        .select('*')
        .eq('estado', 'activa')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (estErr) throw estErr
      if (!estData) {
        setError('No hay estaciones configuradas. Configure una estación primero.')
        setLoading(false)
        return
      }
      setEstacion(estData)

      const { data: turnoData } = await supabase
        .from('est_turnos')
        .select('*')
        .eq('estacion_id', estData.id)
        .eq('estado', 'abierto')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (turnoData) {
        setTurnoActivo(turnoData)
        await loadLecturas(turnoData.id)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!turnoActivo) { setStep('inicio'); return }
    if (lecturas.length === 0) { setStep('lecturas-iniciales'); return }
    const hasInicial = lecturas.every((l) => l.lectura_inicial !== null && l.lectura_inicial !== undefined)
    const hasFinal = lecturas.every((l) => l.lectura_final !== null && l.lectura_final !== undefined)
    if (!hasInicial) setStep('lecturas-iniciales')
    else if (!hasFinal) setStep('lecturas-finales')
    else setStep('cuadre')
  }, [turnoActivo, lecturas])

  const validateTurnoForm = () => {
    const errors: Record<string, string> = {}
    if (!formTurno.empleado.trim()) errors.empleado = 'Nombre del empleado es requerido'
    if (!formTurno.hora_inicio) errors.hora_inicio = 'Hora de inicio es requerida'
    if (!formTurno.fecha) errors.fecha = 'Fecha es requerida'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleIniciarTurno = async () => {
    if (!validateTurnoForm() || !estacion) return
    setSaving(true)
    setError(null)
    try {
      const { data: turno, error: turnoErr } = await supabase
        .from('est_turnos')
        .insert({
          estacion_id: estacion.id,
          empleado: formTurno.empleado.trim(),
          cargo: formTurno.cargo.trim() || null,
          tipo_turno: formTurno.tipo_turno,
          fecha: formTurno.fecha,
          hora_inicio: formTurno.hora_inicio,
          hora_fin_estimada: formTurno.hora_fin_estimada || null,
          observaciones: formTurno.observaciones.trim() || null,
          estado: 'abierto',
        })
        .select()
        .single()

      if (turnoErr) throw turnoErr

      const { data: manguerasData } = await supabase
        .from('est_mangueras')
        .select('*, isla:est_islas(*), surtidor:est_surtidores(*), producto:est_productos(*)')
        .eq('estacion_id', estacion.id)
        .eq('estado', 'activa')
        .order('numero', { ascending: true })

      if (manguerasData && manguerasData.length > 0) {
        const lecturasInsert = manguerasData.map((m: any) => ({
          turno_id: turno.id,
          estacion_id: estacion.id,
          manguera_id: m.id,
          surtidor_id: m.surtidor_id,
          isla_id: m.isla_id,
          producto_id: m.producto_id ?? null,
          nombre_manguera: m.nombre,
          numero_manguera: m.numero,
          nombre_surtidor: m.surtidor?.nombre ?? '',
          numero_surtidor: m.surtidor?.numero ?? 1,
          nombre_isla: m.isla?.nombre ?? '',
          orden_isla: m.isla?.orden ?? 1,
          nombre_producto: m.producto?.nombre ?? null,
          color_producto: m.producto?.color ?? '#94a3b8',
          precio_litro: m.producto?.precio_litro ?? 0,
        }))
        const { error: lecErr } = await supabase.from('est_lecturas').insert(lecturasInsert)
        if (lecErr) throw lecErr
      }

      setTurnoActivo(turno)
      await loadLecturas(turno.id)
      setStep('lecturas-iniciales')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const validateIniciales = () => {
    const errors: Record<string, string> = {}
    lecturas.forEach((l) => {
      const val = inicialesInput[l.manguera_id]
      if (val === undefined || val === '') errors[l.manguera_id] = 'Requerido'
      else if (isNaN(Number(val))) errors[l.manguera_id] = 'Solo números'
      else if (Number(val) < 0) errors[l.manguera_id] = 'No negativo'
    })
    setInicialesErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleGuardarIniciales = async () => {
    if (!validateIniciales()) return
    setSaving(true)
    setError(null)
    try {
      for (const l of lecturas) {
        const { error: updErr } = await supabase
          .from('est_lecturas')
          .update({ lectura_inicial: Number(inicialesInput[l.manguera_id]) })
          .eq('id', l.id)
        if (updErr) throw updErr
      }
      await loadLecturas(turnoActivo!.id)
      setStep('lecturas-finales')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const validateFinales = () => {
    const errors: Record<string, string> = {}
    lecturas.forEach((l) => {
      const val = finalesInput[l.manguera_id]
      if (val === undefined || val === '') errors[l.manguera_id] = 'Requerido'
      else if (isNaN(Number(val))) errors[l.manguera_id] = 'Solo números'
      else if (Number(val) < 0) errors[l.manguera_id] = 'No negativo'
      else if (l.lectura_inicial !== undefined && l.lectura_inicial !== null && Number(val) < l.lectura_inicial) {
        errors[l.manguera_id] = `Final (${val}) < Inicial (${l.lectura_inicial})`
      }
    })
    setFinalesErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleGuardarFinales = async () => {
    if (!validateFinales()) return
    setSaving(true)
    setError(null)
    try {
      let totalGalones = 0
      let totalVentas = 0

      for (const l of lecturas) {
        const final = Number(finalesInput[l.manguera_id])
        const inicial = Number(l.lectura_inicial ?? 0)
        const galones = final - inicial
        const venta = galones * (l.precio_litro ?? 0)
        totalGalones += galones
        totalVentas += venta

        const { error: updErr } = await supabase
          .from('est_lecturas')
          .update({ lectura_final: final, litros_vendidos: galones, venta_total: venta })
          .eq('id', l.id)
        if (updErr) throw updErr
      }

      await supabase
        .from('est_turnos')
        .update({ total_litros: totalGalones, total_galones: totalGalones, total_ventas: totalVentas })
        .eq('id', turnoActivo!.id)

      await loadLecturas(turnoActivo!.id)
      setStep('cuadre')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // After cuadre is saved → load it and show Entrega de Turno
  const handleCuadreSaved = async () => {
    const { data: cuadreData } = await supabase
      .from('est_cuadres')
      .select('*')
      .eq('turno_id', turnoActivo!.id)
      .maybeSingle()
    setCuadre(cuadreData)
    setStep('entrega-turno')
  }

  // After "Entregar Turno" is clicked → mark as pendiente_aprobacion
  const handleEntregarTurno = async () => {
    const horaFin = getCurrentTime()
    await supabase
      .from('est_turnos')
      .update({ estado: 'pendiente_aprobacion', hora_fin_real: horaFin })
      .eq('id', turnoActivo!.id)

    setTurnoActivo(null)
    setLecturas([])
    setCuadre(null)
    setInicialesInput({})
    setFinalesInput({})
    setFormTurno({
      empleado: '',
      cargo: '',
      tipo_turno: 'manana',
      fecha: getCurrentDate(),
      hora_inicio: getCurrentTime(),
      hora_fin_estimada: '',
      observaciones: '',
    })
    setStep('inicio')
    await loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error && !estacion) {
    return (
      <div className="p-6">
        <div className="card p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">{error}</p>
          <button className="btn-secondary mt-4" onClick={loadData}>
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 fade-in">
      <StationHeader estacion={estacion} turnoActivo={turnoActivo} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {turnoActivo && <StepIndicator step={step} />}

      {/* INICIO */}
      {step === 'inicio' && (
        <div className="card p-6 text-center fade-in">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Fuel className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Sin turno activo</h2>
          <p className="text-sm text-slate-500 mb-6">
            Inicia un nuevo turno para comenzar a registrar lecturas de combustible.
          </p>
          <button
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => setStep('form-turno')}
          >
            <Plus className="w-4 h-4" />
            Iniciar Nuevo Turno
          </button>
        </div>
      )}

      {/* FORM TURNO */}
      {step === 'form-turno' && (
        <div className="card p-6 fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Nuevo Turno</h2>
              <p className="text-xs text-slate-500">Complete los datos del empleado y turno</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Empleado *</label>
              <input type="text" className={`input ${formErrors.empleado ? 'input-error' : ''}`}
                placeholder="Nombre completo" value={formTurno.empleado}
                onChange={(e) => setFormTurno({ ...formTurno, empleado: e.target.value })} />
              {formErrors.empleado && <p className="text-xs text-red-500 mt-1">{formErrors.empleado}</p>}
            </div>
            <div>
              <label className="label">Cargo</label>
              <input type="text" className="input" placeholder="Ej: Despachador, Supervisor"
                value={formTurno.cargo}
                onChange={(e) => setFormTurno({ ...formTurno, cargo: e.target.value })} />
            </div>
            <div>
              <label className="label">Turno *</label>
              <select className="input" value={formTurno.tipo_turno}
                onChange={(e) => setFormTurno({ ...formTurno, tipo_turno: e.target.value as 'manana' | 'tarde' | 'noche' })}>
                <option value="manana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className={`input ${formErrors.fecha ? 'input-error' : ''}`}
                value={formTurno.fecha}
                onChange={(e) => setFormTurno({ ...formTurno, fecha: e.target.value })} />
              {formErrors.fecha && <p className="text-xs text-red-500 mt-1">{formErrors.fecha}</p>}
            </div>
            <div>
              <label className="label">Hora Inicio *</label>
              <input type="time" className={`input ${formErrors.hora_inicio ? 'input-error' : ''}`}
                value={formTurno.hora_inicio}
                onChange={(e) => setFormTurno({ ...formTurno, hora_inicio: e.target.value })} />
              {formErrors.hora_inicio && <p className="text-xs text-red-500 mt-1">{formErrors.hora_inicio}</p>}
            </div>
            <div>
              <label className="label">Hora Fin Estimada</label>
              <input type="time" className="input" value={formTurno.hora_fin_estimada}
                onChange={(e) => setFormTurno({ ...formTurno, hora_fin_estimada: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Observaciones del turno (opcional)"
                value={formTurno.observaciones}
                onChange={(e) => setFormTurno({ ...formTurno, observaciones: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button className="btn-secondary" onClick={() => setStep('inicio')}>Cancelar</button>
            <button className="btn-primary flex items-center gap-2" disabled={saving} onClick={handleIniciarTurno}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Iniciar Turno
            </button>
          </div>
        </div>
      )}

      {/* LECTURAS INICIALES */}
      {step === 'lecturas-iniciales' && turnoActivo && (
        <div className="fade-in space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Hash className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Lecturas Iniciales</h2>
                <p className="text-xs text-slate-500">Ingrese la lectura del marcador de cada manguera al inicio del turno</p>
              </div>
            </div>
          </div>

          <LecturasIniciales
            lecturas={lecturas}
            inputs={inicialesInput}
            errors={inicialesErrors}
            onInputChange={(id, val) => {
              setInicialesInput((p) => ({ ...p, [id]: val }))
              if (inicialesErrors[id]) setInicialesErrors((p) => { const n = { ...p }; delete n[id]; return n })
            }}
          />

          <div className="card p-4">
            <TotalesIniciales lecturas={lecturas} inputs={inicialesInput} />
            <div className="mt-4 flex gap-3 justify-end">
              <button className="btn-primary flex items-center gap-2" disabled={saving} onClick={handleGuardarIniciales}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Iniciales
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LECTURAS FINALES */}
      {step === 'lecturas-finales' && turnoActivo && (
        <div className="fade-in space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <StopCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Lecturas Finales — Cierre de Turno</h2>
                <p className="text-xs text-slate-500">Ingrese la lectura final. Los galones y ventas se calculan automáticamente.</p>
              </div>
            </div>
          </div>

          <LecturasFinales
            lecturas={lecturas}
            inputs={finalesInput}
            errors={finalesErrors}
            onInputChange={(id, val) => {
              setFinalesInput((p) => ({ ...p, [id]: val }))
              if (finalesErrors[id]) setFinalesErrors((p) => { const n = { ...p }; delete n[id]; return n })
            }}
          />

          <div className="card p-4 space-y-4">
            <TotalesFinales lecturas={lecturas} finalesInputs={finalesInput} />
            <div className="flex gap-3 justify-end">
              <button className="btn-primary flex items-center gap-2" disabled={saving} onClick={handleGuardarFinales}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                Proceder al Cuadre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUADRE */}
      {step === 'cuadre' && turnoActivo && (
        <EstCuadreForm
          turno={turnoActivo}
          lecturas={lecturas}
          onComplete={handleCuadreSaved}
        />
      )}

      {/* ENTREGA DE TURNO */}
      {step === 'entrega-turno' && turnoActivo && cuadre && estacion && (
        <EstEntregaTurno
          turno={turnoActivo}
          lecturas={lecturas}
          cuadre={cuadre}
          estacion={estacion}
          onEntregar={handleEntregarTurno}
          onBack={() => setStep('cuadre')}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StationHeader({ estacion, turnoActivo }: { estacion: Estacion | null; turnoActivo: EstTurno | null }) {
  const now = new Date()
  const fecha = now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Estación seleccionada</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">{estacion?.nombre ?? 'Sin estación'}</h1>
            {estacion?.ciudad && (
              <p className="text-sm text-slate-500">{estacion.ciudad}{estacion.departamento ? `, ${estacion.departamento}` : ''}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="capitalize">{fecha}</span>
          </div>
          {turnoActivo ? (
            <div className="badge-green">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Turno activo — {turnoActivo.empleado} ({turnoLabel(turnoActivo.tipo_turno)})
            </div>
          ) : (
            <div className="badge-slate">
              <Clock className="w-3.5 h-3.5" />
              Sin turno activo
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { id: 'lecturas-iniciales', label: 'Iniciales' },
    { id: 'lecturas-finales', label: 'Finales' },
    { id: 'cuadre', label: 'Cuadre' },
    { id: 'entrega-turno', label: 'Entrega' },
  ]
  const stepOrder = ['lecturas-iniciales', 'lecturas-finales', 'cuadre', 'entrega-turno']
  const currentIdx = stepOrder.indexOf(step)

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((s, idx) => {
        const done = currentIdx > idx
        const active = currentIdx === idx
        return (
          <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              done ? 'bg-emerald-100 text-emerald-700' :
              active ? 'bg-blue-600 text-white shadow-sm' :
              'bg-slate-100 text-slate-400'
            }`}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
              {s.label}
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-px w-6 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LecturasIniciales({
  lecturas, inputs, errors, onInputChange,
}: {
  lecturas: EstLectura[]
  inputs: Record<string, string>
  errors: Record<string, string>
  onInputChange: (id: string, val: string) => void
}) {
  const groups = groupLecturas(lecturas)
  return (
    <div className="space-y-3">
      {groups.map(([islaId, islaData]) => (
        <div key={islaId} className="card overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">{islaData.nombre}</span>
          </div>
          {Object.entries(islaData.surtidores).sort((a, b) => a[1].numero - b[1].numero).map(([surtId, surt]) => (
            <div key={surtId}>
              <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Surtidor {surt.numero} — {surt.nombre}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 w-24">Manguera</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Producto</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Precio/Gal</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 w-40">Lectura Inicial</th>
                  </tr>
                </thead>
                <tbody>
                  {surt.lecturas.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color_producto }} />
                          <span className="font-medium text-slate-700">{l.nombre_manguera}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{l.nombre_producto ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{formatCurrency(l.precio_litro ?? 0)}/gal</td>
                      <td className="px-4 py-2">
                        <div>
                          <input type="number" min="0" step="0.01"
                            className={`input w-36 text-sm ${errors[l.manguera_id] ? 'input-error' : ''}`}
                            placeholder="0.00"
                            value={inputs[l.manguera_id] ?? ''}
                            onChange={(e) => onInputChange(l.manguera_id, e.target.value)} />
                          {errors[l.manguera_id] && <p className="text-xs text-red-500 mt-0.5">{errors[l.manguera_id]}</p>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function LecturasFinales({
  lecturas, inputs, errors, onInputChange,
}: {
  lecturas: EstLectura[]
  inputs: Record<string, string>
  errors: Record<string, string>
  onInputChange: (id: string, val: string) => void
}) {
  const groups = groupLecturas(lecturas)
  return (
    <div className="space-y-3">
      {groups.map(([islaId, islaData]) => (
        <div key={islaId} className="card overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">{islaData.nombre}</span>
          </div>
          {Object.entries(islaData.surtidores).sort((a, b) => a[1].numero - b[1].numero).map(([surtId, surt]) => (
            <div key={surtId}>
              <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Surtidor {surt.numero} — {surt.nombre}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[620px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Manguera</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Producto</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Inicial</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 w-40">Final</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-emerald-600">Galones</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-blue-600">Venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surt.lecturas.map((l) => {
                      const finalVal = Number(inputs[l.manguera_id] ?? 0)
                      const inicial = l.lectura_inicial ?? 0
                      const galones = finalVal > 0 && finalVal >= inicial ? finalVal - inicial : 0
                      const venta = galones * (l.precio_litro ?? 0)
                      const hasVal = inputs[l.manguera_id] !== undefined && inputs[l.manguera_id] !== ''
                      return (
                        <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color_producto }} />
                              <span className="font-medium text-slate-700">{l.nombre_manguera}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{l.nombre_producto ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatNumber(inicial, 2)}</td>
                          <td className="px-4 py-2">
                            <div>
                              <input type="number" min={inicial} step="0.01"
                                className={`input w-36 text-sm ${errors[l.manguera_id] ? 'input-error' : ''}`}
                                placeholder="0.00"
                                value={inputs[l.manguera_id] ?? ''}
                                onChange={(e) => onInputChange(l.manguera_id, e.target.value)} />
                              {errors[l.manguera_id] && <p className="text-xs text-red-500 mt-0.5 w-36">{errors[l.manguera_id]}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">
                            {hasVal ? `${formatNumber(galones, 2)} gal` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-blue-700">
                            {hasVal ? formatCurrency(venta) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function TotalesIniciales({ lecturas, inputs }: { lecturas: EstLectura[]; inputs: Record<string, string> }) {
  const filled = lecturas.filter((l) => inputs[l.manguera_id] !== undefined && inputs[l.manguera_id] !== '' && !isNaN(Number(inputs[l.manguera_id])))
  const total = filled.reduce((acc, l) => acc + Number(inputs[l.manguera_id]), 0)
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{filled.length} de {lecturas.length} mangueras con lectura</span>
      <div className="text-right">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Total Iniciales</p>
        <p className="text-lg font-bold text-slate-800 font-mono">{formatNumber(total, 2)}</p>
      </div>
    </div>
  )
}

function TotalesFinales({ lecturas, finalesInputs }: { lecturas: EstLectura[]; finalesInputs: Record<string, string> }) {
  let totalGalones = 0
  let totalVentas = 0
  const byProducto: Record<string, { nombre: string; galones: number; ventas: number }> = {}

  lecturas.forEach((l) => {
    const finalStr = finalesInputs[l.manguera_id]
    if (!finalStr || isNaN(Number(finalStr))) return
    const final = Number(finalStr)
    const inicial = l.lectura_inicial ?? 0
    const galones = final >= inicial ? final - inicial : 0
    const venta = galones * (l.precio_litro ?? 0)
    totalGalones += galones
    totalVentas += venta
    const key = l.nombre_producto ?? 'Sin producto'
    if (!byProducto[key]) byProducto[key] = { nombre: key, galones: 0, ventas: 0 }
    byProducto[key].galones += galones
    byProducto[key].ventas += venta
  })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.values(byProducto).map((p) => (
          <div key={p.nombre} className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 font-semibold mb-1">{p.nombre}</p>
            <p className="font-mono font-bold text-slate-800">{formatNumber(p.galones, 2)} gal</p>
            <p className="font-mono text-sm text-blue-600">{formatCurrency(p.ventas)}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
        <div>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Galones</p>
          <p className="text-xl font-bold font-mono text-blue-800">{formatNumber(totalGalones, 2)} gal</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Ventas</p>
          <p className="text-xl font-bold font-mono text-blue-800">{formatCurrency(totalVentas)}</p>
        </div>
      </div>
    </div>
  )
}

export function groupLecturas(lecturas: EstLectura[]) {
  const islaMap: Record<string, {
    nombre: string
    orden: number
    surtidores: Record<string, { nombre: string; numero: number; lecturas: EstLectura[] }>
  }> = {}
  lecturas.forEach((l) => {
    if (!islaMap[l.isla_id]) {
      islaMap[l.isla_id] = { nombre: l.nombre_isla, orden: l.orden_isla, surtidores: {} }
    }
    if (!islaMap[l.isla_id].surtidores[l.surtidor_id]) {
      islaMap[l.isla_id].surtidores[l.surtidor_id] = { nombre: l.nombre_surtidor, numero: l.numero_surtidor, lecturas: [] }
    }
    islaMap[l.isla_id].surtidores[l.surtidor_id].lecturas.push(l)
  })
  return Object.entries(islaMap).sort((a, b) => a[1].orden - b[1].orden)
}
