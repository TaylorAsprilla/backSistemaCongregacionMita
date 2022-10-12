import { DataTypes } from "sequelize";
import db from "../database/connection";

const SolicitudesFamiliares = db.define(
  "SolicitudesFamiliares",
  {
    solicitud_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    familiares_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    tableName: "solicitudesFamiliares",
  }
);

export default SolicitudesFamiliares;
