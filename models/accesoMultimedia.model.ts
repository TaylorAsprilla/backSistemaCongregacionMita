import { DataTypes } from "sequelize";
import db from "../database/connection";

const AccesoMultimedia = db.define(
  "AccesoMultimedia",
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ciudad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    departamento: {
      type: DataTypes.STRING,
    },
    codigoPostal: {
      type: DataTypes.STRING,
    },
    telefono: {
      type: DataTypes.STRING,
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    miembroCongregacion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    distancia: {
      type: DataTypes.STRING,
    },
    familiaEnPR: {
      type: DataTypes.BOOLEAN,
    },
    login: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    pais_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    familia_id: {
      type: DataTypes.INTEGER,
    },
    aprobacion_id: {
      type: DataTypes.INTEGER,
    },
    razonSolicitud_id: {
      type: DataTypes.INTEGER,
    },
    congregacion_id: {
      type: DataTypes.INTEGER,
    },
    congregacionCercana_id: {
      type: DataTypes.INTEGER,
    },
    nacionalidad_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    freezeTableName: true,
    tableName: "accesoMultimedia",
  }
);

export default AccesoMultimedia;
