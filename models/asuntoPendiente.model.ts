import { DataTypes } from "sequelize";
import db from "../database/connection";

const AsuntoPendiente = db.define(
  "AsuntoPendiente",
  {
    asunto: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    responsable: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "asuntoPendiente",
  }
);

export default AsuntoPendiente;
