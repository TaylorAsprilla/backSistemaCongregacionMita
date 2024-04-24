import { DataTypes } from "sequelize";
import db from "../database/connection";

const RolCasa = db.define(
  "RolCasa",
  {
    rolCasa: {
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
    tableName: "rolCasa",
  }
);

export default RolCasa;
