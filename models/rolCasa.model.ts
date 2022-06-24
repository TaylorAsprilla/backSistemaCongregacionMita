import { DataTypes } from "sequelize";
import db from "../database/connection";

const RolCasa = db.define(
  "RolCasa",
  {
    rolCasa: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "rolCasa",
  }
);

export default RolCasa;
