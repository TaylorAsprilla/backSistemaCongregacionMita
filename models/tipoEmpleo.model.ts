import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoEmpleo = db.define(
  "TipoEmpleo",
  {
    nombreEmpleo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "tipoEmpleo",
  }
);

export default TipoEmpleo;
