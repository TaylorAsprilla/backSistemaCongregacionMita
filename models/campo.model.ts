import { DataTypes } from "sequelize";
import db from "../database/connection";

const Campo = db.define(
  "Campo",
  {
    campo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    congregacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "campo",
  }
);

export default Campo;
