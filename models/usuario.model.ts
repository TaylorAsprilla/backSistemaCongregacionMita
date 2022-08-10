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
    numeroDocumento: {
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
    indicativoCasa: {
      type: DataTypes.INTEGER,
    },
    telefonoCasa: {
      type: DataTypes.STRING,
    },
    indicativoCelular: {
      type: DataTypes.INTEGER,
    },
    numeroCelular: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    direccion: {
      type: DataTypes.STRING,
    },
    zipCode: {
      type: DataTypes.STRING,
    },
    login: {
      type: DataTypes.STRING,
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
    genero_id: {
      type: DataTypes.INTEGER,
    },
    tipoDocumento_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    estadoCivil_id: {
      type: DataTypes.INTEGER,
    },
    rolCasa_id: {
      type: DataTypes.INTEGER,
    },
    vacuna_id: {
      type: DataTypes.INTEGER,
    },
    dosis_id: {
      type: DataTypes.INTEGER,
    },
    nacionalidad_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuario",
  }
);

export default Usuario;
