import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoDireccion = db.define(
  "TipoDireccion",
  {
    tipoDireccion: {
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
    tableName: "tipoDireccion",
  }
);

export default TipoDireccion;
