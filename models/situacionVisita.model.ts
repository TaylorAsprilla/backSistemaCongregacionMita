import { DataTypes } from "sequelize/types";
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
    intervension: {
      type: DataTypes.TEXT,
    },
    seguimiento: {
      type: DataTypes.TEXT,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    visita_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "situacionVisita",
  }
);
export default SituacionVisita;
