import { DataTypes } from "sequelize";
import db from "../database/connection";

const Ministerio = db.define(
  "Ministerio",
  {
    ministerio: {
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
    tableName: "ministerio",
  }
);

export default Ministerio;
