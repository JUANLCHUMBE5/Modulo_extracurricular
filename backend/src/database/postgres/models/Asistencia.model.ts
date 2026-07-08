import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

export class AsistenciaModel extends Model {
  public id!: string;
  public inscripcionId!: string;
  public pagoId!: string;
  public dniEstudiante!: string;
  public programaId!: string;
  public estadoAcceso!: string;
  public observacion!: string;
  public origen!: string;
  public fechaRegistro!: string;
}

AsistenciaModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    inscripcionId: { type: DataTypes.TEXT },
    pagoId: { type: DataTypes.TEXT },
    dniEstudiante: { type: DataTypes.TEXT },
    programaId: { type: DataTypes.TEXT },
    estadoAcceso: { type: DataTypes.TEXT },
    observacion: { type: DataTypes.TEXT },
    origen: { type: DataTypes.TEXT },
    fechaRegistro: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "asistencias", timestamps: false }
);
