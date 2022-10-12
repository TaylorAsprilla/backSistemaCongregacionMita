import { DataTypes } from "sequelize";
import db from "../database/connection";

const RazonSolicitud = db.define(
  "RazonSolicitud",
  {
    solicitud: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "razonSolicitud",
  }
);

export default RazonSolicitud;
