import { DataTypes } from "sequelize";
import db from "../database/connection";

const Dosis = db.define(
  "Dosis",
  {
    dosis: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "dosis",
  }
);

export default Dosis;
