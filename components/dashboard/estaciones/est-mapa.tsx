'use client';

import { useState } from 'react';
import { X, Droplet, DollarSign, Tag, Activity, Fuel } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { Isla } from './est-islas';
import type { Surtidor } from './est-surtidores';
import type { Manguera } from './est-mangueras';
import type { Producto } from './est-productos';
import type { Estacion } from './est-estaciones';

interface Props {
  estacion: Estacion;
  islas: Isla[];
  surtidores: Surtidor[];
  mangueras: Manguera[];
  productos: Producto[];
}

export function EstMapa({ estacion, islas, surtidores, mangueras, productos }: Props) {
  const [selectedManguera, setSelectedManguera] = useState<Manguera | null>(null);

  const getProd = (id: string | null) => productos.find((p) => p.id === id);
  const getSurt = (id: string) => surtidores.find((s) => s.id === id);
  const getIsla = (id: string) => islas.find((i) => i.id === id);

  const sortedIslas = [...islas].sort((a, b) => a.orden - b.orden);

  const ESTADO_SURT: Record<string, { dot: string; label: string }> = {
    activo: { dot: 'bg-emerald-400', label: 'Activo' },
    mantenimiento: { dot: 'bg-amber-400', label: 'Mantenimiento' },
    fuera_servicio: { dot: 'bg-red-400', label: 'Fuera de servicio' },
  };

  if (islas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-24 text-center">
        <Fuel className="h-16 w-16 text-slate-200" />
        <h3 className="mt-4 text-lg font-bold text-slate-700">Mapa vacío</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-400">Configura islas, surtidores y mangueras para ver el mapa visual de la estación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Mapa de estación — {estacion.nombre}</h2>
        <p className="text-sm text-slate-500">Vista gráfica de la estructura física. Haz clic en una manguera para ver sus detalles.</p>
      </div>

      {/* Station container */}
      <div className="overflow-x-auto rounded-3xl border-2 border-slate-300 bg-slate-100 p-6 shadow-inner">
        {/* Station header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Fuel className="h-5 w-5" /></div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">{estacion.nombre}</h3>
              <p className="text-xs text-slate-500">{estacion.ciudad || ''} — {islas.length} islas · {surtidores.length} surtidores · {mangueras.length} mangueras</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">Operativa</span>
          </div>
        </div>

        {/* Islas row */}
        <div className="flex flex-wrap gap-5">
          {sortedIslas.map((isla) => {
            const islaSurtidores = surtidores.filter((s) => s.isla_id === isla.id).sort((a, b) => a.numero - b.numero);
            return (
              <div key={isla.id} className="min-w-64 flex-1 rounded-2xl bg-white shadow-md overflow-hidden border border-slate-200">
                {/* Island header */}
                <div className="flex items-center gap-2 px-4 py-3 text-white font-bold" style={{ background: isla.color }}>
                  <span className="text-base">{isla.nombre}</span>
                  <span className="ml-auto text-xs font-normal opacity-80">{isla.codigo || ''}</span>
                </div>

                {/* Surtidores */}
                {islaSurtidores.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">Sin surtidores</div>
                ) : (
                  <div className="flex flex-wrap gap-3 p-4">
                    {islaSurtidores.map((surt) => {
                      const surtMangueras = mangueras.filter((m) => m.surtidor_id === surt.id).sort((a, b) => a.numero - b.numero);
                      const ec = ESTADO_SURT[surt.estado] ?? ESTADO_SURT.activo;
                      return (
                        <div key={surt.id} className="flex-1 min-w-36 rounded-xl border-2 border-slate-200 bg-slate-50 overflow-hidden">
                          {/* Surtidor header */}
                          <div className="flex items-center gap-2 bg-slate-900 px-3 py-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-slate-900 text-xs font-extrabold">S{surt.numero}</div>
                            <span className="text-xs font-semibold text-white truncate flex-1">{surt.nombre}</span>
                            <span className={cn('h-2 w-2 rounded-full', ec.dot)} title={ec.label} />
                          </div>

                          {/* Mangueras */}
                          {surtMangueras.length === 0 ? (
                            <div className="px-3 py-4 text-center text-[10px] text-slate-400">Sin mangueras</div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 p-3">
                              {surtMangueras.map((m) => {
                                const prod = getProd(m.producto_id);
                                const isSelected = selectedManguera?.id === m.id;
                                return (
                                  <button key={m.id}
                                    onClick={() => setSelectedManguera(isSelected ? null : m)}
                                    title={prod?.nombre ?? 'Sin asignar'}
                                    className={cn('group flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all', isSelected ? 'bg-slate-200' : 'hover:bg-slate-100', m.estado !== 'activa' && 'opacity-50')}>
                                    <div
                                      className={cn('flex h-9 w-9 items-center justify-center rounded-full text-white text-[10px] font-extrabold border-2 border-white shadow-md transition-transform group-hover:scale-110', isSelected && 'scale-110 ring-2 ring-slate-400 ring-offset-1')}
                                      style={{ background: m.color || prod?.color || '#94a3b8' }}>
                                      M{m.numero}
                                    </div>
                                    <span className="text-[9px] text-slate-500 text-center leading-tight max-w-10 truncate">{prod?.nombre?.split(' ')[0] ?? '—'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-200 pt-4">
          {productos.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ background: p.color }} />
              {p.nombre}
              <span className="text-slate-400">${p.precio_litro.toLocaleString('es-CO')}/{p.unidad.toLowerCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedManguera} onOpenChange={(v) => { if (!v) setSelectedManguera(null); }}>
        <SheetContent className="w-80">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold shadow-md" style={{ background: selectedManguera?.color ?? '#94a3b8' }}>
                M{selectedManguera?.numero}
              </div>
              {selectedManguera?.nombre}
            </SheetTitle>
          </SheetHeader>
          {selectedManguera && (() => {
            const prod = getProd(selectedManguera.producto_id);
            const surt = getSurt(selectedManguera.surtidor_id);
            const isla = surt ? getIsla(surt.isla_id) : null;
            return (
              <div className="mt-6 space-y-5">
                {/* Product info */}
                {prod ? (
                  <div className="rounded-2xl p-4" style={{ background: `${prod.color}18`, border: `1px solid ${prod.color}40` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: prod.color }}><Droplet className="h-5 w-5" /></div>
                      <div><p className="text-sm font-bold text-slate-900">{prod.nombre}</p><p className="text-xs text-slate-500">{prod.codigo || 'Sin código'}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/70 p-3 text-center">
                        <p className="text-lg font-bold text-slate-900">${prod.precio_litro.toLocaleString('es-CO')}</p>
                        <p className="text-[10px] text-slate-400">por {prod.unidad.toLowerCase()}</p>
                      </div>
                      <div className="rounded-xl bg-white/70 p-3 text-center">
                        <span className={cn('text-sm font-semibold', prod.estado === 'activo' ? 'text-emerald-600' : 'text-slate-400')}>{prod.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
                        <p className="text-[10px] text-slate-400">Estado producto</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 text-center">
                    <p className="text-sm font-medium text-amber-700">Sin producto asignado</p>
                  </div>
                )}

                {/* Location info */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Ubicación</p>
                  {[
                    { label: 'Estación', value: estacion.nombre },
                    { label: 'Isla', value: isla?.nombre ?? '—' },
                    { label: 'Surtidor', value: surt?.nombre ?? '—' },
                    { label: 'Estado manguera', value: selectedManguera.estado },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                      <span className="text-xs text-slate-500">{r.label}</span>
                      <span className="text-xs font-semibold text-slate-900">{r.value}</span>
                    </div>
                  ))}
                </div>

                {selectedManguera.observaciones && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500 mb-1">Observaciones</p>
                    <p className="text-sm text-slate-700">{selectedManguera.observaciones}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
