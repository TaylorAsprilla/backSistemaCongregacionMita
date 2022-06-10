import { DataTypes } from "sequelize";
import db from "../database/connection";

const Meta = db.define(
  "Meta",
  {
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    accion: {
      type: DataTypes.TEXT,
    },
    comentarios: {
      type: DataTypes.TEXT,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipoStatus_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "meta",
  }
);

export default Meta;
