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
    nacionalidad: {
      type: DataTypes.STRING,
      allowNull: false,
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
    numeroCelular: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    telefonoCasa: {
      type: DataTypes.STRING,
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
      type: DataTypes.STRING,
    },
    tipoDocumento_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pais_id: {
      type: DataTypes.STRING,
    },
    estadoCivil_id: {
      type: DataTypes.STRING,
    },
    rolCasa_id: {
      type: DataTypes.STRING,
    },
    vacuna_id: {
      type: DataTypes.STRING,
    },
    dosis_id: {
      type: DataTypes.STRING,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuario",
  }
);

export default Usuario;
