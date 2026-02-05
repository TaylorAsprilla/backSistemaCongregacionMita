import { DataTypes } from "sequelize";
import db from "../database/connection";

const Visita = db.define(
  "Visita",
  {
    mes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    referidasOots: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    visitasHogares: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    visitaHospital: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "visita",
  },
);

export default Visita;
