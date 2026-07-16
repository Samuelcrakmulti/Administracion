import { useState } from 'react'
import {
  Fuel,
  User,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Droplets,
  DollarSign,
  ChevronRight,
  Loader2,
  PenLine,
  Send,
  type LucideIcon,
} from 'lucide-react'
import type { Estacion, EstTurno, EstLectura, EstCuadre } from '../types/estaciones'
import { formatCurrency, formatNumber, formatDateShort, formatTime, turnoLabel } from '../lib/utils'

interface Props {
  turno: EstTurno
  lecturas: EstLectura[]
  cuadre: EstCuadre
  estacion: Estacion
  onEntregar: () => void
  onBack: () => void
}

interface IslaGroup {
  nombre: string
  orden: number
  surtidores: Record<string, SurtidorGroup>
}

interface SurtidorGroup {
  nombre: string
  numero: number
  lecturas: EstLectura[]
}

function groupLecturas(lecturas: EstLectura[]): [string, IslaGroup][] {
  const islaMap: Record<string, IslaGroup> = {}
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

export default function EstEntregaTurno({ turno, lecturas, cuadre, estacion, onEntregar, onBack }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const totalGalones = lecturas.reduce((a, l) => a + (l.litros_vendidos ?? 0), 0)
  const totalVentas = lecturas.reduce((a, l) => a + (l.venta_total ?? 0), 0)
  const manguerasUsadas = lecturas.filter((l) => (l.litros_vendidos ?? 0) > 0).length
  const surtidoresSet = new Set(lecturas.map((l) => l.surtidor_id))
  const productosSet = new Set(lecturas.map((l) => l.nombre_producto).filter(Boolean))

  const byProducto: Record<string, { galones: number; ventas: number; precio: number; color: string }> = {}
  lecturas.forEach((l) => {
    const k = l.nombre_producto ?? 'Sin producto'
    if (!byProducto[k]) byProducto[k] = { galones: 0, ventas: 0, precio: l.precio_litro ?? 0, color: l.color_producto }
    byProducto[k].galones += l.litros_vendidos ?? 0
    byProducto[k].ventas += l.venta_total ?? 0
  })

  const bySurtidor: Record<string, { nombre: string; numero: number; galones: number; ventas: number; mangueras: number }> = {}
  lecturas.forEach((l) => {
    if (!bySurtidor[l.surtidor_id]) bySurtidor[l.surtidor_id] = { nombre: l.nombre_surtidor, numero: l.numero_surtidor, galones: 0, ventas: 0, mangueras: 0 }
    bySurtidor[l.surtidor_id].galones += l.litros_vendidos ?? 0
    bySurtidor[l.surtidor_id].ventas += l.venta_total ?? 0
    bySurtidor[l.surtidor_id].mangueras += 1
  })

  const grupos = groupLecturas(lecturas)
  const diferencia = cuadre.diferencia
  const resultado = cuadre.resultado

  const handleSubmit = async () => {
    setSubmitting(true)
    await onEntregar()
    setSubmitting(false)
  }

  return (
    <div className="fade-in space-y-5">
      {/* Encabezado del documento */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-5 h-5 text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest">Hoja de Entrega de Turno</span>
              </div>
              <h1 className="text-2xl font-bold text-white">{estacion.nombre}</h1>
              {estacion.ciudad && (
                <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {estacion.ciudad}{estacion.departamento ? `, ${estacion.departamento}` : ''}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Fecha</p>
              <p className="text-white font-bold">{formatDateShort(turno.fecha)}</p>
              <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                resultado === 'correcto' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                resultado === 'sobrante' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {resultado === 'correcto' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {resultado === 'correcto' ? 'Cuadre Correcto' : resultado === 'sobrante' ? 'Sobrante' : 'Faltante'}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-slate-100 border-t border-slate-200">
          {([
            [User, 'Empleado', turno.empleado],
            [TrendingUp, 'Cargo', turno.cargo || 'Despachador'],
            [Clock, 'Turno', turnoLabel(turno.tipo_turno)],
            [Calendar, 'Fecha', formatDateShort(turno.fecha)],
            [Clock, 'Hora Inicio', formatTime(turno.hora_inicio)],
            [Clock, 'Hora Fin Est.', turno.hora_fin_estimada ? formatTime(turno.hora_fin_estimada) : '—'],
            [Fuel, 'Estación', estacion.nombre],
            [MapPin, 'Ciudad', estacion.ciudad || '—'],
          ] as [LucideIcon, string, string][]).map(([Icon, label, value]) => (
            <div key={label} className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Galones" value={`${formatNumber(totalGalones, 2)}`} sub="galones vendidos" color="blue" icon={Droplets} />
        <KpiCard label="Venta Total" value={formatCurrency(totalVentas)} sub="ventas registradas" color="emerald" icon={TrendingUp} />
        <KpiCard label="Total Entregado" value={formatCurrency(cuadre.total_entregado)} sub="dinero en caja" color={resultado === 'faltante' ? 'red' : 'emerald'} icon={DollarSign} />
        <KpiCard label="Diferencia" value={`${diferencia >= 0 ? '+' : ''}${formatCurrency(diferencia)}`} sub={resultado === 'correcto' ? 'cuadre perfecto' : resultado === 'sobrante' ? 'sobrante' : 'faltante'} color={resultado === 'correcto' ? 'emerald' : resultado === 'faltante' ? 'red' : 'blue'} icon={resultado === 'correcto' ? CheckCircle2 : AlertTriangle} />
      </div>

      {/* Resumen Operativo */}
      <div className="card p-5">
        <SectionTitle icon={TrendingUp} title="Resumen Operativo" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {([
            ['Galones Vendidos', `${formatNumber(totalGalones, 2)} gal`],
            ['Venta Esperada', formatCurrency(cuadre.ventas_esperadas)],
            ['Mangueras Utilizadas', String(manguerasUsadas)],
            ['Surtidores Activos', String(surtidoresSet.size)],
            ['Productos Vendidos', String(productosSet.size)],
            ['Total Mangueras', String(lecturas.length)],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
              <p className="text-lg font-bold font-mono text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen por Producto */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <SectionTitle icon={Droplets} title="Resumen por Producto" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Producto</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-emerald-600 uppercase tracking-wide">Galones Vendidos</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Precio / Galón</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-blue-600 uppercase tracking-wide">Venta Total</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">% Ventas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(byProducto).map(([nombre, data]) => (
                <tr key={nombre} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                      <span className="font-semibold text-slate-800">{nombre}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700">{formatNumber(data.galones, 2)} gal</td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-600">{formatCurrency(data.precio)}/gal</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-700">{formatCurrency(data.ventas)}</td>
                  <td className="px-5 py-3.5 text-right text-slate-500 text-xs">
                    {totalVentas > 0 ? `${((data.ventas / totalVentas) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t border-slate-200">
                <td className="px-5 py-3 text-slate-700">TOTAL</td>
                <td className="px-5 py-3 text-right font-mono text-emerald-700">{formatNumber(totalGalones, 2)} gal</td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-right font-mono text-blue-700">{formatCurrency(totalVentas)}</td>
                <td className="px-5 py-3 text-right text-slate-400 text-xs">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen por Surtidor */}
      <div className="card p-5">
        <SectionTitle icon={Fuel} title="Resumen por Surtidor" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {Object.entries(bySurtidor).sort((a, b) => a[1].numero - b[1].numero).map(([id, data]) => (
            <div key={id} className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Fuel className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{data.mangueras} mangueras</span>
              </div>
              <p className="font-bold text-slate-700 text-sm mb-1">Surtidor {data.numero}</p>
              <p className="text-xs text-slate-500 mb-2">{data.nombre}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Galones</span>
                  <span className="font-mono font-bold text-emerald-700">{formatNumber(data.galones, 2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Ventas</span>
                  <span className="font-mono font-bold text-blue-700">{formatCurrency(data.ventas)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle por Manguera */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <SectionTitle icon={ChevronRight} title="Detalle por Manguera" />
        </div>
        {grupos.map(([islaId, islaData]) => (
          <div key={islaId}>
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="font-bold text-xs text-slate-600 uppercase tracking-widest">{islaData.nombre}</span>
            </div>
            {Object.entries(islaData.surtidores).sort((a, b) => a[1].numero - b[1].numero).map(([surtId, surt]) => (
              <div key={surtId}>
                <div className="px-5 py-2 bg-slate-50/50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Surtidor {surt.numero} — {surt.nombre}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Manguera</th>
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Producto</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500">Inicial</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500">Final</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-emerald-600">Galones Vend.</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500">Precio/Gal</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-blue-600">Venta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {surt.lecturas.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-5 py-2.5">
                            <span className="inline-flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color_producto }} />
                              <span className="font-medium text-slate-700">{l.nombre_manguera}</span>
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-slate-600">{l.nombre_producto ?? '—'}</td>
                          <td className="px-5 py-2.5 text-right font-mono text-slate-600">{formatNumber(l.lectura_inicial ?? 0, 2)}</td>
                          <td className="px-5 py-2.5 text-right font-mono text-slate-600">{formatNumber(l.lectura_final ?? 0, 2)}</td>
                          <td className="px-5 py-2.5 text-right font-mono font-bold text-emerald-700">{formatNumber(l.litros_vendidos ?? 0, 2)} gal</td>
                          <td className="px-5 py-2.5 text-right font-mono text-slate-500 text-xs">{formatCurrency(l.precio_litro ?? 0)}</td>
                          <td className="px-5 py-2.5 text-right font-mono font-bold text-blue-700">{formatCurrency(l.venta_total ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Cuadre de Caja */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <SectionTitle icon={DollarSign} title="Dinero Entregado" />
          <div className="mt-4 space-y-2">
            {([
              ['Efectivo', cuadre.efectivo],
              ['Tarjetas Crédito', cuadre.tarjetas_credito],
              ['Tarjetas Débito', cuadre.tarjetas_debito],
              ['Transferencias', cuadre.transferencias],
              ['QR', cuadre.qr],
              ['Crédito Empresas', cuadre.credito_empresas],
              ['Otros', cuadre.otros],
            ] as [string, number][]).filter(([, v]) => v > 0).map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{label}</span>
                <span className="font-mono font-semibold text-slate-800">{formatCurrency(value)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200">
              <span className="font-bold text-slate-700">Total Entregado</span>
              <span className="font-mono font-bold text-lg text-slate-800">{formatCurrency(cuadre.total_entregado)}</span>
            </div>
          </div>
        </div>

        <div className="card p-5 flex flex-col">
          <SectionTitle icon={CheckCircle2} title="Resultado del Cuadre" />
          <div className="flex-1 flex flex-col justify-center mt-4 space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-slate-100">
              <span className="text-slate-600">Ventas Esperadas</span>
              <span className="font-mono font-semibold">{formatCurrency(cuadre.ventas_esperadas)}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-slate-100">
              <span className="text-slate-600">Total Entregado</span>
              <span className="font-mono font-semibold">{formatCurrency(cuadre.total_entregado)}</span>
            </div>
            <div className={`rounded-xl p-4 flex items-center gap-3 ${
              resultado === 'correcto' ? 'bg-emerald-50 border-2 border-emerald-200' :
              resultado === 'sobrante' ? 'bg-blue-50 border-2 border-blue-200' :
              'bg-red-50 border-2 border-red-200'
            }`}>
              {resultado === 'correcto'
                ? <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                : <AlertTriangle className={`w-8 h-8 flex-shrink-0 ${resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600'}`} />
              }
              <div>
                <p className={`font-bold text-lg ${resultado === 'correcto' ? 'text-emerald-700' : resultado === 'sobrante' ? 'text-blue-700' : 'text-red-700'}`}>
                  {resultado === 'correcto' ? 'Cuadre Correcto' : resultado === 'sobrante' ? `Sobrante: ${formatCurrency(Math.abs(diferencia))}` : `Faltante: ${formatCurrency(Math.abs(diferencia))}`}
                </p>
                <p className={`text-xs mt-0.5 ${resultado === 'correcto' ? 'text-emerald-600' : resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600'}`}>
                  Diferencia: {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
                </p>
              </div>
            </div>
            {cuadre.observaciones_cuadre && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <span className="font-semibold">Observación: </span>{cuadre.observaciones_cuadre}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Firmas */}
      <div className="card p-5">
        <SectionTitle icon={PenLine} title="Firmas" />
        <p className="text-xs text-slate-500 mt-1 mb-4">Estructura preparada para integración de firmas digitales.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="text-center">
            <div className="h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center mb-3 bg-slate-50">
              <div>
                <PenLine className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-400">Firma Digital Pendiente</p>
              </div>
            </div>
            <div className="border-t border-slate-300 pt-2 text-center">
              <p className="font-semibold text-slate-700">{turno.empleado}</p>
              <p className="text-xs text-slate-500">{turno.cargo || 'Despachador'} — Vendedor</p>
            </div>
          </div>
          <div className="text-center">
            <div className="h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center mb-3 bg-slate-50">
              <div>
                <PenLine className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-400">Pendiente Aprobación</p>
              </div>
            </div>
            <div className="border-t border-slate-300 pt-2 text-center">
              <p className="font-semibold text-slate-400">Por asignar</p>
              <p className="text-xs text-slate-400">Supervisor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>Al entregar, el turno queda <strong className="text-amber-700">Pendiente de Aprobación</strong> del supervisor.</span>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button className="btn-secondary" onClick={onBack}>Volver al Cuadre</button>
          <button className="btn-primary flex items-center gap-2" disabled={submitting} onClick={handleSubmit}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Entregar Turno
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-blue-600" />
      <h3 className="font-bold text-slate-800">{title}</h3>
    </div>
  )
}

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub: string; color: 'blue' | 'emerald' | 'red'; icon: LucideIcon
}) {
  const colors = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600', value: 'text-blue-800', sub: 'text-blue-500' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-800', sub: 'text-emerald-500' },
    red: { bg: 'bg-red-50', border: 'border-red-100', icon: 'bg-red-100 text-red-600', value: 'text-red-800', sub: 'text-red-500' },
  }
  const c = colors[color]
  return (
    <div className={`card ${c.bg} ${c.border} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wide ${c.sub}`}>{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.icon}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className={`text-xl font-bold font-mono ${c.value}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${c.sub}`}>{sub}</p>
    </div>
  )
}
