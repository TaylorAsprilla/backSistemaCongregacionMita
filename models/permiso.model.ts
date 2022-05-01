import { DataTypes } from "sequelize";
import db from "../database/connection";

const Permiso = db.define(
  "Permiso",
  {
    permiso: {
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
    tableName: "permiso",
  }
);

export default Permiso;
