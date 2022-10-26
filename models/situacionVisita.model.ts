import { DataTypes } from "sequelize";
import db from "../database/connection";

const SituacionVisita = db.define(
  "SituacionVisita",
  {
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    nombreFeligres: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    situacion: {
      type: DataTypes.TEXT,
    },
    intervencion: {
      type: DataTypes.TEXT,
    },
    seguimiento: {
      type: DataTypes.TEXT,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    informe_id: {
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
    tableName: "situacionVisita",
  }
);
export default SituacionVisita;
