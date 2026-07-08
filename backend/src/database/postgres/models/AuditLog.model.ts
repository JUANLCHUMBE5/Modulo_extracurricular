import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

export class AuditLogModel extends Model {
  public id!: string;
  public fecha!: string;
  public usuario!: string;
  public rol!: string;
  public accion!: string;
  public detalles!: any;
}

AuditLogModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    fecha: { type: DataTypes.TEXT },
    usuario: { type: DataTypes.TEXT },
    rol: { type: DataTypes.TEXT },
    accion: { type: DataTypes.TEXT },
    detalles: { type: DataTypes.JSONB },
  },
  { sequelize, tableName: "audit_logs", timestamps: false }
);
