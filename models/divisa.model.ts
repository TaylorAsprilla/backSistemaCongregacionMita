import { DataTypes } from "sequelize";
import db from "../database/connection";

const Divisa = db.define(
  "Divisa",
  {
    divisa: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "divisa",
  }
);

export default Divisa;
