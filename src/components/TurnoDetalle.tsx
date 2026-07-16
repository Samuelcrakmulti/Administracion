import { useEffect, useState } from 'react'
import {
  X,
  User,
  Calendar,
  Clock,
  Fuel,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Droplets,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EstTurno, EstLectura, EstCuadre } from '../types/estaciones'
import { formatCurrency, formatNumber, formatDateShort, formatTime, turnoLabel, estadoTurnoLabel } from '../lib/utils'

interface Props {
  turnoId: string
  onClose: () => void
}

export default function TurnoDetalle({ turnoId, onClose }: Props) {
  const [turno, setTurno] = useState<EstTurno | null>(null)
  const [lecturas, setLecturas] = useState<EstLectura[]>([])
  const [cuadre, setCuadre] = useState<EstCuadre | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase.from('est_turnos').select('*').eq('id', turnoId).maybeSingle()
      const { data: l } = await supabase.from('est_lecturas').select('*').eq('turno_id', turnoId).order('orden_isla', { ascending: true })
      const { data: c } = await supabase.from('est_cuadres').select('*').eq('turno_id', turnoId).maybeSingle()
      setTurno(t)
      setLecturas(l ?? [])
      setCuadre(c)
      setLoading(false)
    }
    load()
  }, [turnoId])

  const grupos = groupLecturas(lecturas)
  const totalGalones = lecturas.reduce((a, l) => a + (l.litros_vendidos ?? 0), 0)
  const totalVentas = lecturas.reduce((a, l) => a + (l.venta_total ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Fuel className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Detalle del Turno</h2>
              {turno && <p className="text-xs text-slate-500">{formatDateShort(turno.fecha)} — {turnoLabel(turno.tipo_turno)}</p>}
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors" onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : !turno ? (
            <p className="text-center text-slate-500">No se encontró el turno.</p>
          ) : (
            <>
              {/* Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoCard icon={User} label="Empleado" value={turno.empleado} />
                <InfoCard icon={Clock} label="Turno" value={turnoLabel(turno.tipo_turno)} />
                <InfoCard icon={Calendar} label="Fecha" value={formatDateShort(turno.fecha)} />
                <InfoCard icon={Clock} label="Estado" value={estadoTurnoLabel(turno.estado)} />
                <InfoCard icon={Clock} label="Hora Inicio" value={formatTime(turno.hora_inicio)} />
                {turno.hora_fin_real && <InfoCard icon={Clock} label="Hora Fin" value={formatTime(turno.hora_fin_real)} />}
                {turno.aprobado_por && <InfoCard icon={User} label="Aprobado por" value={turno.aprobado_por} />}
                {turno.rechazado_por && <InfoCard icon={User} label="Rechazado por" value={turno.rechazado_por} />}
              </div>

              {/* Supervisor notes */}
              {turno.supervisor_observaciones && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <span className="font-semibold">Nota del supervisor: </span>
                  {turno.supervisor_observaciones}
                </div>
              )}

              {/* Lecturas grouped */}
              {grupos.map(([islaId, islaData]) => (
                <div key={islaId} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">{islaData.nombre}</span>
                  </div>
                  {Object.entries(islaData.surtidores).sort((a, b) => a[1].numero - b[1].numero).map(([surtId, surt]) => (
                    <div key={surtId}>
                      <div className="px-4 py-1.5 bg-slate-50/50 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">Surtidor {surt.numero} — {surt.nombre}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[560px]">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Manguera</th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Producto</th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Inicial</th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Final</th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-emerald-600">Galones Vend.</th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-blue-600">Venta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {surt.lecturas.map((l) => (
                              <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                                <td className="px-4 py-2.5">
                                  <span className="inline-flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color_producto }} />
                                    <span className="font-medium text-slate-700">{l.nombre_manguera}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">{l.nombre_producto ?? '—'}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatNumber(l.lectura_inicial ?? 0, 2)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatNumber(l.lectura_final ?? 0, 2)}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">
                                  <span className="flex items-center justify-end gap-1">
                                    <Droplets className="w-3 h-3" />
                                    {formatNumber(l.litros_vendidos ?? 0, 2)} gal
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold text-blue-700">{formatCurrency(l.venta_total ?? 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Totales */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Galones Vendidos</p>
                  <p className="text-xl font-bold font-mono text-blue-800 flex items-center gap-1.5">
                    <Droplets className="w-5 h-5" />
                    {formatNumber(totalGalones, 2)} gal
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Ventas</p>
                  <p className="text-xl font-bold font-mono text-blue-800">{formatCurrency(totalVentas)}</p>
                </div>
              </div>

              {/* Cuadre */}
              {cuadre && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Cuadre de Caja
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {([
                      ['Efectivo', cuadre.efectivo],
                      ['T. Crédito', cuadre.tarjetas_credito],
                      ['T. Débito', cuadre.tarjetas_debito],
                      ['Transferencias', cuadre.transferencias],
                      ['QR', cuadre.qr],
                      ['Crédito Empresas', cuadre.credito_empresas],
                      ['Otros', cuadre.otros],
                    ] as [string, number][]).filter(([, v]) => v > 0).map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-mono font-medium text-slate-700">{formatCurrency(value)}</span>
                      </div>
                    ))}
                    <div className="col-span-2 border-t border-slate-200 pt-2 flex justify-between">
                      <span className="font-semibold text-slate-700">Total Entregado</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(cuadre.total_entregado)}</span>
                    </div>
                    <div className="col-span-2 flex justify-between items-center">
                      <span className="font-semibold text-slate-700">Diferencia</span>
                      <div className={`flex items-center gap-2 font-mono font-bold ${
                        cuadre.resultado === 'correcto' ? 'text-emerald-600' :
                        cuadre.resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {cuadre.resultado === 'correcto'
                          ? <CheckCircle2 className="w-4 h-4" />
                          : <AlertTriangle className="w-4 h-4" />}
                        {cuadre.resultado === 'correcto' ? 'Cuadre Correcto' :
                         cuadre.resultado === 'sobrante' ? `+${formatCurrency(cuadre.diferencia)}` :
                         formatCurrency(cuadre.diferencia)}
                      </div>
                    </div>
                  </div>
                  {cuadre.observaciones_cuadre && (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-500">Observaciones: </span>
                      {cuadre.observaciones_cuadre}
                    </div>
                  )}
                </div>
              )}

              {turno.observaciones && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
                  <span className="font-semibold">Observaciones del turno: </span>
                  {turno.observaciones}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
      </div>
      <p className="font-semibold text-slate-800 text-sm">{value}</p>
    </div>
  )
}

function groupLecturas(lecturas: EstLectura[]) {
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
