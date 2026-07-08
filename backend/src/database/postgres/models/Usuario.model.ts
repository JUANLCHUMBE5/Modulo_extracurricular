import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

export class UsuarioModel extends Model {
  public id!: string;
  public nombre!: string;
  public usuario!: string;
  public contrasena!: string;
  public rol!: string;
  public estado!: string;
  public permisos!: any;
}

UsuarioModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    nombre: { type: DataTypes.TEXT, allowNull: false },
    usuario: { type: DataTypes.TEXT, allowNull: false, unique: true },
    contrasena: { type: DataTypes.TEXT, allowNull: false },
    rol: { type: DataTypes.TEXT, allowNull: false },
    estado: { type: DataTypes.TEXT },
    permisos: { type: DataTypes.JSONB },
  },
  { sequelize, tableName: "usuarios", timestamps: false }
);
