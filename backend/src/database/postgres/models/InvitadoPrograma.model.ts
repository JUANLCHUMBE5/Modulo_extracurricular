import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

export class InvitadoProgramaModel extends Model {
  public programaId!: string;
  public dni!: string;
  public nombres!: string;
  public grado!: string;
  public seccion!: string;
  public seleccion!: string;
  public nivelCambridge!: string;
}

InvitadoProgramaModel.init(
  {
    programaId: { type: DataTypes.TEXT, primaryKey: true },
    dni: { type: DataTypes.TEXT, primaryKey: true },
    nombres: { type: DataTypes.TEXT },
    grado: { type: DataTypes.TEXT },
    seccion: { type: DataTypes.TEXT },
    seleccion: { type: DataTypes.TEXT },
    nivelCambridge: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "invitados_programa", timestamps: false }
);
