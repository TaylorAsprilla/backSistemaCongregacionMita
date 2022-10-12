import { DataTypes } from "sequelize";
import db from "../database/connection";

const Parentesco = db.define(
  "Parentesco",
  {
    parentesco: {
      type: DataTypes.STRING,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "parentesco",
  }
);

export default Parentesco;
