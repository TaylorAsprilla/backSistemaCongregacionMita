import { DataTypes } from "sequelize";
import db from "../database/connection";

const EstadoCivil = db.define(
  "EstadoCivil",
  {
    estadoCivil: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "estadoCivil",
  }
);

export default EstadoCivil;
