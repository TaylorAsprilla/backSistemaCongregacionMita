import { DataTypes } from "sequelize";
import db from "../database/connection";

const Actividad = db.define(
  "Actividad",
  {
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    cantidadRecaudada: {
      type: DataTypes.DECIMAL,
    },
    responsable: {
      type: DataTypes.STRING,
    },
    asistencia: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipoActividad_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    idSeccion: {
      type: DataTypes.INTEGER,
      // allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "actividad",
  }
);

export default Actividad;
