import { DataTypes } from "sequelize";
import db from "../database/connection";

const SeccionInforme = db.define(
  "SeccionInforme",
  {
    seccion: {
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
    tableName: "seccionInforme",
  }
);

export default SeccionInforme;
