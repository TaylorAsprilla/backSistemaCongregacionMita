import { DataTypes } from "sequelize";
import db from "../database/connection";

const Solicitud = db.define(
  "solicitudes",
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
    otraRazon: {
      type: DataTypes.STRING,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    razonSolicitud_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nacionalidad_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    usuarioQueRegistra_id: {
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
