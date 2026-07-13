import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

// ==========================================
// MODELO BASE: Programa
// ==========================================
export class ProgramaModel extends Model {
  public id!: string;
  public nombre!: string;
  public categoria!: string;
  public fechaInicio!: string;
  public fechaFin!: string;
  public costo!: number;
  public cupos!: number;
  public cuposOcupados!: number;
  public gradosAplicables!: any;
  public periodo!: string;
  public modalidadCobro!: string;
  public horario!: string;
  public grupo!: string;
}
ProgramaModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    nombre: { type: DataTypes.TEXT },
    categoria: { type: DataTypes.TEXT },
    fechaInicio: { type: DataTypes.TEXT },
    fechaFin: { type: DataTypes.TEXT },
    costo: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cupos: { type: DataTypes.INTEGER, defaultValue: 0 },
    cuposOcupados: { type: DataTypes.INTEGER, defaultValue: 0 },
    gradosAplicables: { type: DataTypes.JSONB },
    periodo: { type: DataTypes.TEXT },
    modalidadCobro: { type: DataTypes.TEXT },
    horario: { type: DataTypes.TEXT },
    grupo: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "programas", timestamps: false }
);

// ==========================================
// EXTENSIÓN: ProgramaConfiguracion
// ==========================================
export class ProgramaConfiguracionModel extends Model {
  public programaId!: string;
  public duracionAvisoDias!: number;
  public horaLimiteAviso!: string;
  public edadMinima!: number;
  public edadMaxima!: number;
  public grupoEtario!: string;
  public requisitos!: string;
  public comunicado!: string;
  public comunicadoCompleto!: string;
  public detalleCosto!: string;
  public creadoDesdeDocumento!: boolean;
  public duracionTaller!: string;
  public invitacionMasiva!: boolean;
  public alcanceInvitacionMasiva!: string;
  public tipoComunicado!: string;
  public motivoJustificacion!: string;
  public docente!: string;
  public responsable!: string;
  public estado!: string;
  public usarFechaLimiteInscripcion!: boolean;
  public fechaAperturaInscripcion!: string;
  public horaAperturaInscripcion!: string;
  public fechaLimiteInscripcion!: string;
  public horaLimiteInscripcion!: string;
}
ProgramaConfiguracionModel.init(
  {
    programaId: { type: DataTypes.TEXT, primaryKey: true },
    duracionAvisoDias: { type: DataTypes.INTEGER, defaultValue: 0 },
    horaLimiteAviso: { type: DataTypes.TEXT },
    edadMinima: { type: DataTypes.INTEGER, defaultValue: 0 },
    edadMaxima: { type: DataTypes.INTEGER, defaultValue: 0 },
    grupoEtario: { type: DataTypes.TEXT },
    requisitos: { type: DataTypes.TEXT },
    comunicado: { type: DataTypes.TEXT },
    comunicadoCompleto: { type: DataTypes.TEXT },
    detalleCosto: { type: DataTypes.TEXT },
    creadoDesdeDocumento: { type: DataTypes.BOOLEAN, defaultValue: false },
    duracionTaller: { type: DataTypes.TEXT },
    invitacionMasiva: { type: DataTypes.BOOLEAN, defaultValue: false },
    alcanceInvitacionMasiva: { type: DataTypes.TEXT },
    tipoComunicado: { type: DataTypes.TEXT },
    motivoJustificacion: { type: DataTypes.TEXT },
    docente: { type: DataTypes.TEXT },
    responsable: { type: DataTypes.TEXT },
    estado: { type: DataTypes.TEXT },
    usarFechaLimiteInscripcion: { type: DataTypes.BOOLEAN, defaultValue: false },
    fechaAperturaInscripcion: { type: DataTypes.TEXT },
    horaAperturaInscripcion: { type: DataTypes.TEXT },
    fechaLimiteInscripcion: { type: DataTypes.TEXT },
    horaLimiteInscripcion: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "programas_configuraciones", timestamps: false }
);

// ==========================================
// EXTENSIÓN: ProgramaHorario
// ==========================================
export class ProgramaHorarioModel extends Model {
  public programaId!: string;
  public horaInicio!: string;
  public horaFin!: string;
  public horariosPorGrupo!: any;
  public tablaHorariosNivel!: any;
}
ProgramaHorarioModel.init(
  {
    programaId: { type: DataTypes.TEXT, primaryKey: true },
    horaInicio: { type: DataTypes.TEXT },
    horaFin: { type: DataTypes.TEXT },
    horariosPorGrupo: { type: DataTypes.JSONB },
    tablaHorariosNivel: { type: DataTypes.JSONB },
  },
  { sequelize, tableName: "programas_horarios", timestamps: false }
);

// ==========================================
// EXTENSIÓN: ProgramaServicio
// ==========================================
export class ProgramaServicioModel extends Model {
  public programaId!: string;
  public requiereUniforme!: boolean;
  public requiereIndumentaria!: boolean;
  public incluyeAlmuerzo!: boolean;
  public horarioRecepcionAlmuerzo!: string;
  public concesionarios!: any;
  public detalleAlmuerzo!: string;
  public nivelCambridge!: string;
  public modalidadesCambridge!: any;
  public costoCiclo!: number;
  public montoPrimerPago!: number;
  public cicloI!: any;
  public cicloII!: any;
  public nombreCiclo!: string;
  public fechaExamen!: string;
  public lugarExamen!: string;
  public precioStarters!: string;
  public precioMovers!: string;
  public precioFlyers!: string;
  public precioKet!: string;
  public precioPet!: string;
  public numeroCuotas!: string;
  public fechaVencCuota1!: string;
  public fechaVencCuota2!: string;
  public fechaVencCuota3!: string;
  public fechaLimitePago!: string;
}
ProgramaServicioModel.init(
  {
    programaId: { type: DataTypes.TEXT, primaryKey: true },
    requiereUniforme: { type: DataTypes.BOOLEAN, defaultValue: false },
    requiereIndumentaria: { type: DataTypes.BOOLEAN, defaultValue: false },
    incluyeAlmuerzo: { type: DataTypes.BOOLEAN, defaultValue: false },
    horarioRecepcionAlmuerzo: { type: DataTypes.TEXT },
    concesionarios: { type: DataTypes.JSONB },
    detalleAlmuerzo: { type: DataTypes.TEXT },
    nivelCambridge: { type: DataTypes.TEXT },
    modalidadesCambridge: { type: DataTypes.JSONB },
    costoCiclo: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    montoPrimerPago: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cicloI: { type: DataTypes.JSONB },
    cicloII: { type: DataTypes.JSONB },
    nombreCiclo: { type: DataTypes.TEXT },
    fechaExamen: { type: DataTypes.TEXT },
    lugarExamen: { type: DataTypes.TEXT },
    precioStarters: { type: DataTypes.TEXT },
    precioMovers: { type: DataTypes.TEXT },
    precioFlyers: { type: DataTypes.TEXT },
    precioKet: { type: DataTypes.TEXT },
    precioPet: { type: DataTypes.TEXT },
    numeroCuotas: { type: DataTypes.TEXT },
    fechaVencCuota1: { type: DataTypes.TEXT },
    fechaVencCuota2: { type: DataTypes.TEXT },
    fechaVencCuota3: { type: DataTypes.TEXT },
    fechaLimitePago: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "programas_servicios", timestamps: false }
);

// ==========================================
// EXTENSIÓN: ProgramaDocumento
// ==========================================
export class ProgramaDocumentoModel extends Model {
  public programaId!: string;
  public plantilla!: string;
  public plantillaBase64!: string;
  public plantillaVariables!: any;
  public plantillaValidada!: boolean;
  public tipoDocumento!: string;
  public numeroDocumento!: string;
  public areaTematica!: string;
}
ProgramaDocumentoModel.init(
  {
    programaId: { type: DataTypes.TEXT, primaryKey: true },
    plantilla: { type: DataTypes.TEXT },
    plantillaBase64: { type: DataTypes.TEXT },
    plantillaVariables: { type: DataTypes.JSONB },
    plantillaValidada: { type: DataTypes.BOOLEAN, defaultValue: false },
    tipoDocumento: { type: DataTypes.TEXT },
    numeroDocumento: { type: DataTypes.TEXT },
    areaTematica: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "programas_documentos", timestamps: false }
);

// ==========================================
// EXTENSIÓN: ProgramaAnuncio
// ==========================================
export class ProgramaAnuncioModel extends Model {
  public programaId!: string;
  public anuncioImagen!: string;
  public anuncioImagenNombre!: string;
  public anuncioImagenTamano!: number;
  public anuncioImagenComprimida!: boolean;
}
ProgramaAnuncioModel.init(
  {
    programaId: { type: DataTypes.TEXT, primaryKey: true },
    anuncioImagen: { type: DataTypes.TEXT },
    anuncioImagenNombre: { type: DataTypes.TEXT },
    anuncioImagenTamano: { type: DataTypes.INTEGER },
    anuncioImagenComprimida: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { sequelize, tableName: "programas_anuncios", timestamps: false }
);
