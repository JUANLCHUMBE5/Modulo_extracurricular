export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  rol: string;
  roles?: string[]; // Soporte multi-rol
  estado: string;
  contrasena: string;
  permisos?: string[];
}

export interface Estudiante {
  dni: string;
  codigoEstudiante: string;
  nombres: string;
  grado: string;
  seccion: string;
  nivel: string;
  sexo: string;
  fechaNacimiento: string;
  tipoAlumno: string;
  estadoMatricula: string;
  apoderado?: string;
  telefonoApoderado?: string;
  correoApoderado?: string;
  apellidos?: string;
  esExterno?: boolean;
}

export interface Programa {
  id: string;
  nombre: string;
  categoria?: string;
  fechaInicio?: string;
  fechaFin?: string;
  costo?: number | string;
  cupos?: number;
  cuposOcupados?: number;
  gradosAplicables?: string[];
  periodo?: string;
  modalidadCobro?: string;
  horario?: string;
  grupo?: string;
  [key: string]: any;
}

export interface Invitado {
  programaId?: string;
  dni: string;
  nombres: string;
  grado: string;
  seccion: string;
  seleccion?: string;
  nivelCambridge?: string;
  [key: string]: any;
}

export interface Inscripcion {
  id: string;
  dniEstudiante: string;
  programaId: string;
  estadoPago: string;
  pagoId: string | null;
  costoOriginal: number;
  descuentoAprobado: boolean;
  descuentoTipo?: string;
  descuentoValor?: number;
  descuentoMonto?: number;
  descuentoJustificacion?: string;
  descuentoAprobadoPor?: string;
  descuentoFechaAprobacion?: string | null;
  derivadoCaja?: boolean;
  estadoCaja?: string;
  origenRegistro?: string;
  fechaRegistro?: string | null;
  [key: string]: any;
}

export interface Pago {
  id: string;
  inscripcionId: string | null;
  dniEstudiante: string | null;
  programaId: string | null;
  monto: number;
  formaPago: string;
  numeroOperacion: string;
  telefonoOperacion: string;
  capturaPagoNombre?: string;
  capturaPagoBase64?: string;
  estado: string;
  fechaPago?: string | null;
  origenRegistro?: string;
  nro_recibo?: string;
  [key: string]: any;
}

export interface Asistencia {
  id: string;
  inscripcionId: string | null;
  pagoId: string | null;
  dniEstudiante: string | null;
  programaId: string | null;
  estadoAcceso: string;
  observacion?: string;
  origen?: string;
  fechaRegistro?: string | null;
  [key: string]: any;
}

export interface HistorialCarga {
  id: string;
  fecha: string | null;
  periodo?: string;
  archivoNombre?: string;
  archivos?: string[];
  usuario?: string;
  resumen?: {
    importados?: number;
    total?: number;
    errores?: number;
    duplicados?: number;
  };
  registros?: any[];
}

export interface SyncEvent {
  id: string;
  entidades: string[];
  details?: any;
  createdAt: string;
}

export interface ConfiguracionInstitucional {
  logoInstitucion: string | null;
  logoCambridge: string | null;
  firmaCoordinacion: string | null;
  firmaDireccion: string | null;
  selloInstitucion: string | null;
}

export interface Correlativos {
  recibo?: string;
  egreso?: string;
  [key: string]: any;
}

export interface LocalDatabase {
  usuarios: Usuario[];
  estudiantes: Record<string, Estudiante>;
  programas: Programa[];
  invitadosPorPrograma: Record<string, Invitado[]>;
  inscripciones: Inscripcion[];
  documentosGenerados: any[];
  pagos: Pago[];
  asistencias: Asistencia[];
  historialCargas: HistorialCarga[];
  categorias: string[];
  configuracionInstitucional: ConfiguracionInstitucional;
  correlativos: Correlativos;
  syncEvents: SyncEvent[];
  auditLogs: any[];
  nextProgramaId: number;
  nextCargaId?: number;
  nextDocumentoId?: number;
  programas_documentos?: any[];
  plantillasPorPrograma?: Record<string, any>;
}
