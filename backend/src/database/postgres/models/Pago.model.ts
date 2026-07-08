import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";
import { InscripcionModel } from "./Inscripcion.model.js";

export class PagoModel extends Model {
  public id!: string;
  public inscripcionId!: string;
  public dniEstudiante!: string;
  public programaId!: string;
  public monto!: number;
  public formaPago!: string;
  public numeroOperacion!: string;
  public telefonoOperacion!: string;
  public capturaPagoNombre!: string;
  public capturaPagoBase64!: string;
  public estado!: string;
  public fecha!: string;
  public fechaPago!: string;
  public origenRegistro!: string;
  public nroRecibo!: string;
}

PagoModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    inscripcionId: { type: DataTypes.TEXT },
    dniEstudiante: { type: DataTypes.TEXT },
    programaId: { type: DataTypes.TEXT },
    monto: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    formaPago: { type: DataTypes.TEXT },
    numeroOperacion: { type: DataTypes.TEXT },
    telefonoOperacion: { type: DataTypes.TEXT },
    capturaPagoNombre: { type: DataTypes.TEXT },
    capturaPagoBase64: { type: DataTypes.TEXT },
    estado: { type: DataTypes.TEXT },
    fecha: { type: DataTypes.TEXT },
    fechaPago: { type: DataTypes.DATEONLY },
    origenRegistro: { type: DataTypes.TEXT },
    nroRecibo: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "pagos", timestamps: false }
);

// ==========================================
// REGISTRO DE HOOKS
// ==========================================

PagoModel.afterSave(async (pago) => {
  if (pago.inscripcionId) {
    try {
      const estadoLower = String(pago.estado).toLowerCase();
      if (estadoLower === "anulado") {
        await InscripcionModel.update(
          { estadoPago: "pendiente" },
          { where: { id: pago.inscripcionId } }
        );
      } else if (estadoLower === "pagado" || estadoLower === "completado") {
        await InscripcionModel.update(
          { estadoPago: "pagado" },
          { where: { id: pago.inscripcionId } }
        );
      }
    } catch (err) {
      console.error(`[HOOK ERROR] Error actualizando estado de inscripción desde pago ${pago.id}:`, err);
    }
  }
});
