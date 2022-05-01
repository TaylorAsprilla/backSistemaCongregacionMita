import { DataTypes } from "sequelize";
import db from "../database/connection";

const Genero = db.define(
  "Genero",
  {
    genero: {
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
    tableName: "genero",
  }
);

export default Genero;
