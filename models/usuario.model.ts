import { DataTypes } from "sequelize";
import db from "../database/connection";

const Usuario = db.define(
  "Usuario",
  {
    primerNombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    segundoNombre: {
      type: DataTypes.STRING,
    },
    primerApellido: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    segundoApellido: {
      type: DataTypes.STRING,
    },
    apodo: {
      type: DataTypes.STRING,
    },

    fechaNacimiento: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    telefonoCasa: {
      type: DataTypes.STRING,
    },
    numeroCelular: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    ingresoMensual: {
      type: DataTypes.STRING,
    },
    esJoven: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    especializacionEmpleo: {
      type: DataTypes.STRING,
    },
    numeroDocumento: {
      type: DataTypes.STRING,
      unique: true,
    },
    login: {
      type: DataTypes.STRING,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
    },
    foto: {
      type: DataTypes.STRING,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    resetToken: {
      type: DataTypes.STRING,
    },
    genero_id: {
      type: DataTypes.INTEGER,
    },
    estadoCivil_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rolCasa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    vacuna_id: {
      type: DataTypes.INTEGER,
    },
    dosis_id: {
      type: DataTypes.INTEGER,
    },
    nacionalidad_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gradoAcademico_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipoEmpleo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipoMiembro_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipoDocumento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuario",
  }
);

export default Usuario;
