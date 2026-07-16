export interface Estacion {
  id: string
  user_id: string
  nombre: string
  empresa?: string
  ciudad?: string
  departamento?: string
  direccion?: string
  telefono?: string
  correo?: string
  administrador?: string
  estado: string
  created_at?: string
}

export interface EstIsla {
  id: string
  user_id: string
  estacion_id: string
  nombre: string
  codigo?: string
  descripcion?: string
  estado: string
  color: string
  orden: number
  created_at?: string
}

export interface EstSurtidor {
  id: string
  user_id: string
  isla_id: string
  estacion_id: string
  numero: number
  nombre: string
  codigo?: string
  marca?: string
  modelo?: string
  estado: string
  created_at?: string
}

export interface EstProducto {
  id: string
  user_id: string
  nombre: string
  codigo?: string
  color: string
  precio_litro: number
  unidad: string
  estado: string
  descripcion?: string
  created_at?: string
}

export interface EstManguera {
  id: string
  user_id: string
  surtidor_id: string
  isla_id: string
  estacion_id: string
  numero: number
  nombre: string
  producto_id?: string
  color: string
  estado: string
  observaciones?: string
  created_at?: string
  producto?: EstProducto
}

export type EstadoTurno =
  | 'abierto'
  | 'pendiente_aprobacion'
  | 'en_revision'
  | 'cerrado'
  | 'aprobado'
  | 'rechazado'

export interface EstTurno {
  id: string
  user_id: string
  estacion_id: string
  empleado: string
  cargo?: string
  tipo_turno: 'manana' | 'tarde' | 'noche'
  fecha: string
  hora_inicio: string
  hora_fin_estimada?: string
  hora_fin_real?: string
  estado: EstadoTurno
  total_litros?: number
  total_ventas?: number
  total_galones?: number
  observaciones?: string
  aprobado_por?: string
  aprobado_at?: string
  rechazado_por?: string
  rechazado_at?: string
  supervisor_observaciones?: string
  firma_vendedor?: string
  firma_supervisor?: string
  revisado_por?: string
  revisado_at?: string
  created_at?: string
}

export interface EstLectura {
  id: string
  user_id: string
  turno_id: string
  manguera_id: string
  surtidor_id: string
  isla_id: string
  estacion_id: string
  producto_id?: string
  nombre_manguera: string
  numero_manguera: number
  nombre_surtidor: string
  numero_surtidor: number
  nombre_isla: string
  orden_isla: number
  nombre_producto?: string
  color_producto: string
  precio_litro: number
  lectura_inicial?: number
  lectura_final?: number
  litros_vendidos?: number
  venta_total?: number
  created_at?: string
}

export interface EstCuadre {
  id: string
  user_id: string
  turno_id: string
  estacion_id: string
  ventas_esperadas: number
  efectivo: number
  tarjetas_credito: number
  tarjetas_debito: number
  transferencias: number
  qr: number
  credito_empresas: number
  otros: number
  total_entregado: number
  diferencia: number
  resultado: 'correcto' | 'faltante' | 'sobrante'
  observaciones_cuadre?: string
  created_at?: string
}

export interface IslaGroup {
  isla_id: string
  nombre: string
  orden: number
  color: string
  surtidores: SurtidorGroup[]
}

export interface SurtidorGroup {
  surtidor_id: string
  nombre: string
  numero: number
  lecturas: EstLectura[]
}
