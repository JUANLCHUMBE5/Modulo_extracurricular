import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

export class HistorialCargaModel extends Model {
  public id!: string;
  public fecha!: string;
  public periodo!: string;
  public archivoNombre!: string;
  public archivos!: any;
  public usuario!: string;
  public resumen!: any;
  public registros!: any;
}

HistorialCargaModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    fecha: { type: DataTypes.TEXT },
    periodo: { type: DataTypes.TEXT },
    archivoNombre: { type: DataTypes.TEXT },
    archivos: { type: DataTypes.JSONB },
    usuario: { type: DataTypes.TEXT },
    resumen: { type: DataTypes.JSONB },
    registros: { type: DataTypes.JSONB },
  },
  { sequelize, tableName: "historial_cargas", timestamps: false }
);
