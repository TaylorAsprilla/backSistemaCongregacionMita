import { DataTypes } from "sequelize";
import db from "../database/connection";

const Informe = db.define(
  "Informe",
  {
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "informe",
  }
);

export default Informe;
