import { DataTypes } from "sequelize";
import db from "../database/connection";

const ActividadEconomica = db.define(
  "ActividadEconomica",
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
    tipoActividadEconomica_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "actividadEconomica",
  },
);

export default ActividadEconomica;
