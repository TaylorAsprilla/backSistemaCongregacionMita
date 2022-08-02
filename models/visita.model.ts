import { DataTypes } from "sequelize";
import db from "../database/connection";

const Visita = db.define(
  "Visita",
  {
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    visitasHogares: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    efectivo: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    referidasOots: {
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
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    idSeccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "visita",
  }
);

export default Visita;
