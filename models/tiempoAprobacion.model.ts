import { DataTypes } from "sequelize";
import db from "../database/connection";

const TiempoAprobacion = db.define(
  "TiempoAprobacion",
  {
    tiempo: {
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
    tableName: "tiempoAprobacion",
  }
);

export default TiempoAprobacion;
