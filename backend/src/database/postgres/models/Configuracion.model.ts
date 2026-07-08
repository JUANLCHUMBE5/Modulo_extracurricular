import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

export class ConfiguracionModel extends Model {
  public id!: string;
  public nombreInstitucion!: string;
  public periodoActivo!: string;
  public logoUrl!: string;
  public direccion!: string;
  public telefono!: string;
}

ConfiguracionModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    nombreInstitucion: { type: DataTypes.TEXT },
    periodoActivo: { type: DataTypes.TEXT },
    logoUrl: { type: DataTypes.TEXT },
    direccion: { type: DataTypes.TEXT },
    telefono: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "configuracion", timestamps: false }
);
