import { DataTypes } from "sequelize";
import db from "../database/connection";

const Logro = db.define(
  "Logro",
  {
    logro: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "logro",
  }
);

export default Logro;
