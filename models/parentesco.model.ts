import { DataTypes } from "sequelize";
import db from "../database/connection";

const Parentesco = db.define(
  "Parentesco",
  {
    login: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    solicitud_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tiempoAprobacion_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "parentesco",
  }
);

export default Parentesco;
