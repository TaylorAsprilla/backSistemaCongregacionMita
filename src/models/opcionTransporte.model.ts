import { DataTypes } from "sequelize";
import db from "../database/connection";

const OpcionTransporte = db.define(
  "OpcionTransporte",
  {
    tipoTransporte: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "opcionTransporte",
  }
);

export default OpcionTransporte;
