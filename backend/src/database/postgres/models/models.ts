import { CategoriaModel } from "./Categoria.model.js";
import { UsuarioModel } from "./Usuario.model.js";
import { EstudianteModel } from "./Estudiante.model.js";
import {
  ProgramaModel,
  ProgramaConfiguracionModel,
  ProgramaHorarioModel,
  ProgramaServicioModel,
  ProgramaDocumentoModel,
  ProgramaAnuncioModel,
} from "./Programa.model.js";
import { InvitadoProgramaModel } from "./InvitadoPrograma.model.js";
import { InscripcionModel } from "./Inscripcion.model.js";
import { PagoModel } from "./Pago.model.js";
import { AsistenciaModel } from "./Asistencia.model.js";
import { HistorialCargaModel } from "./HistorialCarga.model.js";
import { AuditLogModel } from "./AuditLog.model.js";
import { ConfiguracionModel } from "./Configuracion.model.js";

// ==========================================
// ESTABLECER RELACIONES (ASOCIACIONES)
// ==========================================

// Relación 1-1 entre Programa y sus extensiones
ProgramaModel.hasOne(ProgramaConfiguracionModel, { foreignKey: "programaId", as: "configuracion", onDelete: "CASCADE" });
ProgramaConfiguracionModel.belongsTo(ProgramaModel, { foreignKey: "programaId" });

ProgramaModel.hasOne(ProgramaHorarioModel, { foreignKey: "programaId", as: "horarioInfo", onDelete: "CASCADE" });
ProgramaHorarioModel.belongsTo(ProgramaModel, { foreignKey: "programaId" });

ProgramaModel.hasOne(ProgramaServicioModel, { foreignKey: "programaId", as: "servicioInfo", onDelete: "CASCADE" });
ProgramaServicioModel.belongsTo(ProgramaModel, { foreignKey: "programaId" });

ProgramaModel.hasOne(ProgramaDocumentoModel, { foreignKey: "programaId", as: "documentoInfo", onDelete: "CASCADE" });
ProgramaDocumentoModel.belongsTo(ProgramaModel, { foreignKey: "programaId" });

ProgramaModel.hasOne(ProgramaAnuncioModel, { foreignKey: "programaId", as: "anuncioInfo", onDelete: "CASCADE" });
ProgramaAnuncioModel.belongsTo(ProgramaModel, { foreignKey: "programaId" });

// Relación entre Programa e Inscripcion
ProgramaModel.hasMany(InscripcionModel, { foreignKey: "programaId", as: "inscripciones", onDelete: "CASCADE" });
InscripcionModel.belongsTo(ProgramaModel, { foreignKey: "programaId", as: "programa" });

// Relación entre Estudiante e Inscripcion (usando DNI)
EstudianteModel.hasMany(InscripcionModel, { foreignKey: "dniEstudiante", sourceKey: "dni", as: "inscripciones", onDelete: "CASCADE" });
InscripcionModel.belongsTo(EstudianteModel, { foreignKey: "dniEstudiante", targetKey: "dni", as: "estudiante" });

// Relación entre Inscripcion y Pago
InscripcionModel.hasOne(PagoModel, { foreignKey: "inscripcionId", as: "pago", onDelete: "SET NULL" });
PagoModel.belongsTo(InscripcionModel, { foreignKey: "inscripcionId", as: "inscripcion" });

// Relación entre Estudiante y Pago (usando DNI)
EstudianteModel.hasMany(PagoModel, { foreignKey: "dniEstudiante", sourceKey: "dni", as: "pagos", onDelete: "CASCADE" });
PagoModel.belongsTo(EstudianteModel, { foreignKey: "dniEstudiante", targetKey: "dni", as: "estudiante" });

// Relación entre Programa y Asistencia
ProgramaModel.hasMany(AsistenciaModel, { foreignKey: "programaId", as: "asistencias", onDelete: "CASCADE" });
AsistenciaModel.belongsTo(ProgramaModel, { foreignKey: "programaId", as: "programa" });

// Relación entre Estudiante y Asistencia (usando DNI)
EstudianteModel.hasMany(AsistenciaModel, { foreignKey: "dniEstudiante", sourceKey: "dni", as: "asistencias", onDelete: "CASCADE" });
AsistenciaModel.belongsTo(EstudianteModel, { foreignKey: "dniEstudiante", targetKey: "dni", as: "estudiante" });

// Relación entre Programa e InvitadoPrograma
ProgramaModel.hasMany(InvitadoProgramaModel, { foreignKey: "programaId", as: "invitados", onDelete: "CASCADE" });
InvitadoProgramaModel.belongsTo(ProgramaModel, { foreignKey: "programaId", as: "programa" });

// Exportar todos los modelos de forma centralizada
export {
  CategoriaModel,
  UsuarioModel,
  EstudianteModel,
  ProgramaModel,
  ProgramaConfiguracionModel,
  ProgramaHorarioModel,
  ProgramaServicioModel,
  ProgramaDocumentoModel,
  ProgramaAnuncioModel,
  InvitadoProgramaModel,
  InscripcionModel,
  PagoModel,
  AsistenciaModel,
  HistorialCargaModel,
  AuditLogModel,
  ConfiguracionModel,
};
