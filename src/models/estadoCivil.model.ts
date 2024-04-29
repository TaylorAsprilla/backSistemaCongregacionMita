import { DataTypes } from "sequelize";
import db from "../database/connection";

const EstadoCivil = db.define(
  "EstadoCivil",
  {
    estadoCivil: {
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
    tableName: "estadoCivil",
  }
);

export default EstadoCivil;
