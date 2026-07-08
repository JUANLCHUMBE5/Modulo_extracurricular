import { DataTypes, Model, Op } from "sequelize";
import { sequelize } from "../connection.js";
import { ProgramaModel } from "./Programa.model.js";
import { EstudianteModel } from "./Estudiante.model.js";

export class InscripcionModel extends Model {
  public id!: string;
  public dniEstudiante!: string;
  public programaId!: string;
  public estadoPago!: string;
  public pagoId!: string;
  public costoOriginal!: number;
  public descuentoAprobado!: boolean;
  public descuentoTipo!: string;
  public descuentoValor!: number;
  public descuentoFechaAprobacion!: string;
  public descuentoMonto!: number;
  public descuentoJustificacion!: string;
  public descuentoAprobadoPor!: string;
  public derivadoCaja!: boolean;
  public estadoCaja!: string;
  public origenRegistro!: string;
  public fechaRegistro!: string;
}

InscripcionModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    dniEstudiante: { type: DataTypes.TEXT },
    programaId: { type: DataTypes.TEXT },
    estadoPago: { type: DataTypes.TEXT },
    pagoId: { type: DataTypes.TEXT },
    costoOriginal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    descuentoAprobado: { type: DataTypes.BOOLEAN, defaultValue: false },
    descuentoTipo: { type: DataTypes.TEXT },
    descuentoValor: { type: DataTypes.DECIMAL(30, 2), defaultValue: 0 },
    descuentoFechaAprobacion: { type: DataTypes.TEXT },
    descuentoMonto: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    descuentoJustificacion: { type: DataTypes.TEXT },
    descuentoAprobadoPor: { type: DataTypes.TEXT },
    derivadoCaja: { type: DataTypes.BOOLEAN, defaultValue: false },
    estadoCaja: { type: DataTypes.TEXT },
    origenRegistro: { type: DataTypes.TEXT },
    fechaRegistro: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "inscripciones", timestamps: false }
);

// ==========================================
// METODOS AUXILIARES PARA HOOKS
// ==========================================

async function recalcularCuposPrograma(programaId: string) {
  if (!programaId) return;
  try {
    const count = await InscripcionModel.count({
      where: {
        programaId,
        estadoPago: {
          [Op.notIn]: ["anulado", "rechazado"],
        },
      },
    });
    await ProgramaModel.update({ cuposOcupados: count }, { where: { id: programaId } });
  } catch (err) {
    console.error(`[HOOK ERROR] Error recalculando cupos del programa ${programaId}:`, err);
  }
}

async function recalcularEstadoEstudiante(dniEstudiante: string) {
  if (!dniEstudiante) return;
  try {
    const inscripciones = await InscripcionModel.findAll({
      where: { dniEstudiante },
    });

    if (inscripciones.length === 0) {
      await EstudianteModel.update(
        { estadoInscripcion: null, estadoCaja: null },
        { where: { dni: dniEstudiante } }
      );
      return;
    }

    const allPaid = inscripciones.every((ins) => String(ins.estadoPago).toLowerCase() === "pagado");
    const hasPending = inscripciones.some((ins) => String(ins.estadoPago).toLowerCase() === "pendiente" || ins.derivadoCaja);

    await EstudianteModel.update(
      {
        estadoInscripcion: hasPending ? "pendiente" : "inscrito",
        estadoCaja: allPaid ? "pagado" : "pendiente",
      },
      { where: { dni: dniEstudiante } }
    );
  } catch (err) {
    console.error(`[HOOK ERROR] Error recalculando estado del estudiante ${dniEstudiante}:`, err);
  }
}

// ==========================================
// REGISTRO DE HOOKS
// ==========================================

InscripcionModel.afterCreate(async (instance) => {
  await recalcularCuposPrograma(instance.programaId);
  await recalcularEstadoEstudiante(instance.dniEstudiante);
});

InscripcionModel.afterUpdate(async (instance) => {
  if (instance.changed("programaId")) {
    const prevProgramaId = instance.previous("programaId");
    if (prevProgramaId) await recalcularCuposPrograma(prevProgramaId);
  }
  await recalcularCuposPrograma(instance.programaId);
  await recalcularEstadoEstudiante(instance.dniEstudiante);
});

InscripcionModel.afterDestroy(async (instance) => {
  await recalcularCuposPrograma(instance.programaId);
  await recalcularEstadoEstudiante(instance.dniEstudiante);
});
