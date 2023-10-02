import { DataTypes } from "sequelize";
import db from "../database/connection";

const Vacuna = db.define(
  "Vacuna",
  {
    vacuna: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "vacuna",
  }
);

export default Vacuna;
