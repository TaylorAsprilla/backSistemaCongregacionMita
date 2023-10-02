import { DataTypes } from "sequelize";
import db from "../database/connection";

const FuenteIngreso = db.define(
  "FuenteIngreso",
  {
    fuenteIngreso: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "fuenteIngreso",
  }
);

export default FuenteIngreso;
