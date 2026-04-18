import { DataTypes } from "sequelize";
import db from "../database/connection";

const ActividadEspiritual = db.define(
  "ActividadEspiritual",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    responsable: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "actividadEspiritual",
  },
);

export default ActividadEspiritual;
