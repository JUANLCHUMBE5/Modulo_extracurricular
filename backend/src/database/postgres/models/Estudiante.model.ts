import { DataTypes, Model } from "sequelize";
import { sequelize } from "../connection.js";

export class EstudianteModel extends Model {
  public dni!: string;
  public codigoEstudiante!: string;
  public nombres!: string;
  public apellidos!: string;
  public grado!: string;
  public nivel!: string;
  public seccion!: string;
  public sexo!: string;
  public fechaNacimiento!: string;
  public tipoAlumno!: string;
  public estadoMatricula!: string;
  public apoderado!: string;
  public telefonoApoderado!: string;
  public correoApoderado!: string;
  public estadoInscripcion!: string;
  public estadoCaja!: string;
}

EstudianteModel.init(
  {
    dni: { type: DataTypes.TEXT, primaryKey: true },
    codigoEstudiante: { type: DataTypes.TEXT },
    nombres: { type: DataTypes.TEXT },
    apellidos: { type: DataTypes.TEXT },
    grado: { type: DataTypes.TEXT },
    nivel: { type: DataTypes.TEXT },
    seccion: { type: DataTypes.TEXT },
    sexo: { type: DataTypes.TEXT },
    fechaNacimiento: { type: DataTypes.TEXT },
    tipoAlumno: { type: DataTypes.TEXT },
    estadoMatricula: { type: DataTypes.TEXT },
    apoderado: { type: DataTypes.TEXT },
    telefonoApoderado: { type: DataTypes.TEXT },
    correoApoderado: { type: DataTypes.TEXT },
    estadoInscripcion: { type: DataTypes.TEXT },
    estadoCaja: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "estudiantes", timestamps: false }
);
