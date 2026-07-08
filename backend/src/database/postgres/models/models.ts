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
