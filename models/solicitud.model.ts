import { DataTypes } from "sequelize";
import db from "../database/connection";

const Solicitud = db.define(
  "solicitudes",
  {
    nombre: {
      type: DataTypes.DATE,
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
    pais: {
      type: DataTypes.STRING,
      allowNull: false,
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
    },
    congregacionCercana: {
      type: DataTypes.STRING,
    },
    distancia: {
      type: DataTypes.STRING,
    },
    familiaEnPR: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    razonSolicitud_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nacionalidad_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "solicitudes",
  }
);
export default Solicitud;
