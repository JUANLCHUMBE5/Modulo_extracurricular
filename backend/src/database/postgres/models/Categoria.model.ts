import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

export class CategoriaModel extends Model {
  public id!: string;
  public nombre!: string;
  public color!: string;
  public icono!: string;
}

CategoriaModel.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    nombre: { type: DataTypes.TEXT },
    color: { type: DataTypes.TEXT },
    icono: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "categorias", timestamps: false }
);
